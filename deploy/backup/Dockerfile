FROM rclone/rclone:1.76.0 AS rclone

# Same major version as the database, so pg_dump and pg_restore match the server.
FROM postgres:18.7
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=rclone /usr/local/bin/rclone /usr/local/bin/rclone
COPY deploy/backup/backup-env.sh deploy/backup/snapshot-manifest.sh deploy/backup/backup.sh deploy/backup/restore.sh /usr/local/bin/
RUN chmod 0755 /usr/local/bin/backup.sh /usr/local/bin/restore.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
