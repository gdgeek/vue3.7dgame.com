# # 应用端口
VITE_APP_PORT = 3001

# # 代理前缀
# VITE_APP_BASE_API = '/dev-api'

# # 接口地址
# # VITE_APP_API_URL = http://vapi.youlai.tech
# VITE_APP_API_URL = https://api.7dgame.com

# # 是否启用 Mock 服务
# VITE_MOCK_DEV_SERVER = false


# just a flag
ENV = 'voxelparty.com'

# VITE_APP_BLOCKLY_URL="http://localhost:3000"
# VITE_APP_EDITOR_URL="http://localhost:3002"

# VITE_APP_BLOCKLY_URL="http://127.0.0.1:3000"
VITE_APP_BLOCKLY_URL = "https://blockly.voxelparty.com"
#VITE_APP_BLOCKLY_URL="https://blockly.01xr.com"
VITE_APP_EDITOR_URL = "https://editor.voxelparty.com"


# VITE_APP_BASE_API = 'https://api.01xr.com'
VITE_APP_BASE_API = "https://api.voxelparty.com"
VITE_APP_AI_API = "https://ai.voxelparty.com"
VITE_APP_BASE_URL = 'https://voxelparty.com'
 
VITE_APP_BASE_MODE = 'voxelparty.com'
VITE_APP_DOC_API = 'https://hololens2.cn/wp-json/wp/v2/'


