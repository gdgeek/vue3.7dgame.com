# just a flag
ENV = '7dgame.com'


VITE_APP_BLOCKLY_URL="https://blockly.7dgame.com"
VITE_APP_EDITOR_URL="https://editor.7dgame.com"
# base api
VITE_APP_BASE_API = 'https://api.7dgame.com'

# VITE_APP_BASE_API = "http://127.0.0.1:81"
# base web
VITE_APP_BASE_URL = 'https://7dgame.com'


VITE_APP_AI_API="https://rodin.7dgame.com"
VITE_APP_A1_API="https://a1.7dgame.com"

VITE_APP_BASE_MODE = '7dgame.com'

VITE_APP_DOC_API = 'https://hololens2.cn/wp-json/wp/v2/'
