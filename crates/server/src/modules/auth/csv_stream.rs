use std::future::Future;

use axum::body::Body;
use csv::{Terminator, Writer, WriterBuilder};
use futures_util::{Stream, StreamExt};
use tokio::sync::mpsc;

use crate::shared::http::api_error::ApiError;

const ROWS_PER_CHUNK: usize = 128;
const UTF8_BOM: &[u8] = "\u{feff}".as_bytes();

pub type CsvSender = mpsc::Sender<Result<Vec<u8>, std::io::Error>>;

pub fn csv_body<F>(write: impl FnOnce(CsvSender) -> F + Send + 'static) -> Body
where
    F: Future<Output = Result<(), ApiError>> + Send,
{
    let (sender, receiver) = mpsc::channel(2);
    tokio::spawn(async move {
        if let Err(error) = write(sender.clone()).await {
            tracing::warn!(?error, "CSV export stopped");
            let delivered = sender
                .send(Err(std::io::Error::other("CSV export failed")))
                .await;
            drop(delivered);
        }
    });

    Body::from_stream(futures_util::stream::unfold(
        receiver,
        |mut receiver| async move {
            let next = receiver.recv().await?;

            Some((next, receiver))
        },
    ))
}

pub fn csv_chunk(with_header: bool) -> Writer<Vec<u8>> {
    let bytes = if with_header {
        UTF8_BOM.to_vec()
    } else {
        Vec::new()
    };

    WriterBuilder::new()
        .terminator(Terminator::CRLF)
        .from_writer(bytes)
}

pub async fn send_csv<Row>(
    sender: CsvSender,
    rows: impl Stream<Item = Result<Row, sqlx::Error>> + Send,
    header: &[&str],
    write_row: fn(&mut Writer<Vec<u8>>, &Row) -> Result<(), ApiError>,
) -> Result<(), ApiError> {
    let mut rows = std::pin::pin!(rows);
    let mut writer = csv_chunk(true);
    writer.write_record(header).map_err(ApiError::internal)?;
    let mut buffered = 0_usize;

    loop {
        let row = tokio::select! {
            () = sender.closed() => return Ok(()),
            item = rows.next() => item,
        };
        let Some(row) = row else { break };
        write_row(&mut writer, &row?)?;
        buffered = buffered.saturating_add(1);

        if buffered == ROWS_PER_CHUNK {
            let chunk = finish_csv(writer)?;
            if sender.send(Ok(chunk)).await.is_err() {
                return Ok(());
            }

            writer = csv_chunk(false);
            buffered = 0;
        }
    }

    let chunk = finish_csv(writer)?;
    if chunk.is_empty() == false {
        drop(sender.send(Ok(chunk)).await);
    }

    Ok(())
}

fn finish_csv(writer: Writer<Vec<u8>>) -> Result<Vec<u8>, ApiError> {
    writer.into_inner().map_err(ApiError::internal)
}
