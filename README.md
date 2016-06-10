# Snapshot for Kibana
Scheduled Report Generation for ElasticSearch Kibana!

### HOW TO START DOCKER INSTANCE
> docker build -t parvez/snapshot_for_kibana .

> docker run -p 49160:8080 -d parvez/snapshot_for_kibana


### CONFIGURATION
You can find configuration file \app\config\server.json

- os_type - For selection of phantomjs binary
- dashboard_url & dashboards_list_url - Kibana URLs
- basic_auth_users - Basic authentication list of users

### LICENSE
Developed by Parvez Copyright (c) 2016 parvezh@gmail.com Licensed 
under the MIT License http://opensource.org/licenses/MIT
