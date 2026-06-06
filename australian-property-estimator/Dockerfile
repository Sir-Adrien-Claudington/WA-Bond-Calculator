FROM nginx:alpine

# Copy only the web-serving files into the HTML root
COPY index.html styles.css app.js chart.min.js /usr/share/nginx/html/
COPY data/ /usr/share/nginx/html/data/
COPY modules/ /usr/share/nginx/html/modules/

# Nginx config with PORT substitution
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
