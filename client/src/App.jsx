import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home       from './pages/Home'
import CreateRoom from './pages/CreateRoom'
import JoinRoom   from './pages/JoinRoom'
import Room       from './pages/Room'
import About      from './pages/About'
import Layout     from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="create" element={<CreateRoom />} />
          <Route path="join" element={<JoinRoom />} />
          <Route path="room/:roomId" element={<Room />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
