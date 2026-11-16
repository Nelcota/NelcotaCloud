# Same major version as the database, so pg_dump and pg_restore match the server.
FROM postgres:17
RUN apt-get update \
    && apt-get install --yes --no-install-recommends rclone ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY deploy/backup/backup-env.sh deploy/backup/backup.sh deploy/backup/restore.sh /usr/local/bin/
RUN chmod 0755 /usr/local/bin/backup.sh /usr/local/bin/restore.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
