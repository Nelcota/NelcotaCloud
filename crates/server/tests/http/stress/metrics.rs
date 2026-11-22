use std::collections::BTreeMap;
use std::io::Write;
use std::time::{Duration, Instant};

use futures_util::{StreamExt, stream};
use reqwest::{Response, StatusCode, header::RETRY_AFTER};
use serde_json::{Value, json};
use tokio::time::Instant as TokioInstant;

use crate::support::TestResult;

pub struct Trial {
    counts: BTreeMap<String, usize>,
}

pub struct Load {
    pub count: usize,
    pub concurrency: usize,
    pub interval: Duration,
}

impl Load {
    pub const fn burst(count: usize, concurrency: usize) -> Self {
        Self {
            count,
            concurrency,
            interval: Duration::ZERO,
        }
    }
}

impl Trial {
    pub fn require(self, expected: &[(&str, usize)]) -> TestResult {
        let counts = expected
            .iter()
            .map(|(status, count)| ((*status).to_owned(), *count))
            .collect::<BTreeMap<_, _>>();

        if self.counts != counts {
            return Err(format!("expected {counts:?}, observed {:?}", self.counts).into());
        }

        Ok(())
    }

    pub fn require_only(&self, statuses: &[&str]) -> TestResult {
        for status in self.counts.keys() {
            if statuses.contains(&status.as_str()) == false {
                return Err(format!("unexpected outcome: {status}").into());
            }
        }

        Ok(())
    }

    pub fn count(&self, status: &str) -> usize {
        self.counts.get(status).copied().unwrap_or_default()
    }
}

pub async fn exercise(
    name: &str,
    load: Load,
    request: impl AsyncFn(usize) -> TestResult<String>,
) -> TestResult<Trial> {
    let Load {
        count,
        concurrency,
        interval,
    } = load;
    let started = Instant::now();
    let first_request = TokioInstant::now();
    let request = &request;
    let mut samples = stream::iter(0..count)
        .map(|index| async move {
            if interval.is_zero() == false {
                let position = u32::try_from(index).unwrap_or(u32::MAX);
                let due = first_request
                    .checked_add(interval.saturating_mul(position))
                    .unwrap_or(first_request);
                tokio::time::sleep_until(due).await;
            }

            let started = Instant::now();
            let result = request(index).await;

            (
                started.elapsed(),
                result.unwrap_or_else(|error| format!("error: {error}")),
            )
        })
        .buffer_unordered(concurrency);
    let mut timings = Vec::with_capacity(count);
    let mut counts = BTreeMap::new();

    while let Some((elapsed, outcome)) = samples.next().await {
        timings.push(elapsed);
        let total = counts.entry(outcome).or_insert(0_usize);
        *total = total.saturating_add(1);
    }

    let elapsed = started.elapsed().as_secs_f64();
    timings.sort_unstable();
    let report = json!({
        "scenario": name, "operations": count, "concurrency": concurrency,
        "seconds": elapsed, "operations_per_second": f64::from(u32::try_from(count)?) / elapsed,
        "p50_ms": percentile(&timings, 50), "p95_ms": percentile(&timings, 95),
        "p99_ms": percentile(&timings, 99), "max_ms": percentile(&timings, 100),
        "outcomes": counts
    });
    writeln!(std::io::stdout().lock(), "{report}")?;

    Ok(Trial { counts })
}

pub async fn status(response: Response) -> TestResult<String> {
    let status = response.status();

    if status == StatusCode::TOO_MANY_REQUESTS {
        let seconds = response
            .headers()
            .get(RETRY_AFTER)
            .ok_or("missing Retry-After")?;
        let seconds = seconds.to_str()?.parse::<u64>()?;
        assert!(seconds > 0, "Retry-After must give a positive delay");
    }

    let body = response.bytes().await?;

    if status.is_success() {
        return Ok(status.as_str().to_owned());
    }

    let error: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    let code = error
        .get("error")
        .and_then(Value::as_str)
        .unwrap_or("no_api_error_code");

    Ok(format!("{} {code}", status.as_str()))
}

pub fn report_elapsed(name: &str, count: usize, started: Instant) -> TestResult {
    let report = json!({ "scenario": name, "operations": count, "seconds": started.elapsed().as_secs_f64() });
    writeln!(std::io::stdout().lock(), "{report}")?;

    Ok(())
}

fn percentile(timings: &[Duration], percentage: usize) -> f64 {
    let position = timings
        .len()
        .saturating_mul(percentage)
        .div_ceil(100)
        .saturating_sub(1);

    timings
        .get(position)
        .copied()
        .unwrap_or_default()
        .as_secs_f64()
        * 1000.0
}
