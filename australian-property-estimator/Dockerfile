FROM nginx:alpine

# Copy only the web-serving files into the HTML root
COPY index.html privacy.html terms.html styles.css app.js chart.min.js robots.txt sitemap.xml og-image.png /usr/share/nginx/html/
COPY data/ /usr/share/nginx/html/data/
COPY modules/ /usr/share/nginx/html/modules/
COPY fonts/ /usr/share/nginx/html/fonts/

# Nginx config with PORT substitution
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx-http.conf /etc/nginx/conf.d/http.conf

# Give the nginx worker user ownership of everything it needs to write at runtime:
#   /usr/share/nginx/html — static file root
#   /var/cache/nginx      — client body / proxy temp dirs
#   /var/log/nginx        — access + error logs
#   /etc/nginx/conf.d     — generated default.conf written at container start
#   /var/run/nginx.pid    — PID file (touch creates it so chown succeeds)
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /var/run/nginx.pid && \
    chmod -R 755 /usr/share/nginx/html /etc/nginx/conf.d

# Run as non-root. Railway always injects an unprivileged port (>= 1024) so
# nginx can bind without CAP_NET_BIND_SERVICE. The "user" directive in nginx.conf
# is silently ignored when the master is already non-root.
USER nginx

CMD ["/bin/sh", "-c", "export PORT=${PORT:-8080} && envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
