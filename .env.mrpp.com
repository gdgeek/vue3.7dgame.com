# just a flag
ENV = 'mrpp.com'


# base api

VITE_APP_BASE_API = 'https://api.mrpp.com'
# base web
VITE_APP_BASE_URL = 'https://app.mrpp.com'

VITE_APP_BASE_MODE = 'mrpp.com'

VITE_APP_DOC_API = 'https://hololens2.cn/wp-json/wp/v2/'
