-=-=-=-=-=-
HOW TO START DOCKER INSTANCE OF SNAPSHOT FOR KIBANA
-=-=-=-=-=-

> docker build -t parvez/snapshot_for_kibana .
> docker run -p 49160:8080 -d parvez/snapshot_for_kibana
> docker ps -a
> docker logs <container id>

-=-=-=-=-=-

-=-=-=-=-=-
CONFIGURATION
-=-=-=-=-=-

You can find configuration file \app\config\server.json

> os_type - For selection of phantomjs binary
> dashboard_url & dashboards_list_url - Kibana URLs
> basic_auth_users - Basic authentication list of users

-=-=-=-=-=-
