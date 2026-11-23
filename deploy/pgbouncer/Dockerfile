# PgBouncer from Alpine's own package, so updates come with the distribution's security fixes.
FROM alpine:3.22
# The package ships no user of its own: PgBouncer runs as this one, never as root.
RUN apk add --no-cache pgbouncer openssl \
    && addgroup -S pgbouncer \
    && adduser -S -G pgbouncer -H -s /sbin/nologin pgbouncer \
    && mkdir -p /etc/pgbouncer /var/lib/pgbouncer/tls \
    && chown -R pgbouncer:pgbouncer /etc/pgbouncer /var/lib/pgbouncer
COPY deploy/pgbouncer/pgbouncer.ini.template /etc/pgbouncer/pgbouncer.ini.template
COPY deploy/pgbouncer/entrypoint.sh /usr/local/bin/pgbouncer-entrypoint.sh
RUN chmod 0755 /usr/local/bin/pgbouncer-entrypoint.sh
USER pgbouncer
EXPOSE 6543
ENTRYPOINT ["/usr/local/bin/pgbouncer-entrypoint.sh"]
