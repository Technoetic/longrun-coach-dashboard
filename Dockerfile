FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY pages/ /usr/share/nginx/html/pages/
COPY src/ /usr/share/nginx/html/src/
RUN cp /usr/share/nginx/html/pages/index.html /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
