import 'dotenv/config'
import { createApp } from './app'

const app = createApp()
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`)
})
