FROM nginx:alpine

# Copy only the web-serving files into the HTML root
COPY index.html styles.css app.js chart.min.js robots.txt sitemap.xml og-image.png /usr/share/nginx/html/
COPY data/ /usr/share/nginx/html/data/
COPY modules/ /usr/share/nginx/html/modules/

# Nginx config with PORT substitution
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx-http.conf /etc/nginx/conf.d/http.conf

# Restrict ownership of served files to the nginx worker user
RUN chown -R nginx:nginx /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html

CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
