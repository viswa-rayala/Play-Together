import { useEffect, useRef, useState } from 'react'
import mediaSocket from '../services/mediaSocket'
import '../styles/MeetBox.css'

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

function MeetBox({ participantName }) {
  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map())
  const pendingCandidatesRef = useRef(new Map())
  const [joined, setJoined] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [remotePeers, setRemotePeers] = useState([])
  const [error, setError] = useState('')

  const updatePeer = (peerId, name, stream) => {
    setRemotePeers((current) => {
      const existing = current.find((peer) => peer.id === peerId)
      if (existing) return current.map((peer) => peer.id === peerId ? { ...peer, name, stream } : peer)
      return [...current, { id: peerId, name, stream }]
    })
  }

  const removePeer = (peerId) => {
    const peer = peersRef.current.get(peerId)
    peer?.close()
    peersRef.current.delete(peerId)
    pendingCandidatesRef.current.delete(peerId)
    setRemotePeers((current) => current.filter((peer) => peer.id !== peerId))
  }

  const createPeer = (peerId, peerName, initiator) => {
    const existing = peersRef.current.get(peerId)
    if (existing) return existing

    const peer = new RTCPeerConnection(RTC_CONFIG)
    peersRef.current.set(peerId, peer)
    localStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current))
    peer.onicecandidate = (event) => {
      if (event.candidate) mediaSocket.sendMeetSignal(peerId, { candidate: event.candidate })
    }
    peer.ontrack = (event) => updatePeer(peerId, peerName, event.streams[0])
    peer.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) removePeer(peerId)
    }

    if (initiator) {
      peer.createOffer()
        .then((offer) => peer.setLocalDescription(offer).then(() => {
          mediaSocket.sendMeetSignal(peerId, { description: peer.localDescription })
        }))
        .catch(() => setError('Could not connect to a participant.'))
    }
    return peer
  }

  useEffect(() => {
    const onPeers = ({ peers }) => {
      if (!joined) return
      peers.forEach((peer) => createPeer(peer.id, peer.name, true))
    }
    const onPeerJoined = () => {}
    const onPeerLeft = ({ id }) => removePeer(id)
    const onSignal = async ({ senderId, senderName, signal }) => {
      if (!joined) return
      const peer = createPeer(senderId, senderName, false)
      try {
        if (signal.description) {
          await peer.setRemoteDescription(signal.description)
          const candidates = pendingCandidatesRef.current.get(senderId) || []
          for (const candidate of candidates) await peer.addIceCandidate(candidate)
          pendingCandidatesRef.current.delete(senderId)
          if (signal.description.type === 'offer') {
            const answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)
            mediaSocket.sendMeetSignal(senderId, { description: peer.localDescription })
          }
        } else if (signal.candidate) {
          if (peer.remoteDescription) await peer.addIceCandidate(signal.candidate)
          else pendingCandidatesRef.current.set(senderId, [
            ...(pendingCandidatesRef.current.get(senderId) || []),
            signal.candidate,
          ])
        }
      } catch {
        setError('Meet connection could not be established.')
      }
    }

    mediaSocket.on('MEET_PEERS', onPeers)
    mediaSocket.on('MEET_PEER_JOINED', onPeerJoined)
    mediaSocket.on('MEET_PEER_LEFT', onPeerLeft)
    mediaSocket.on('MEET_SIGNAL', onSignal)
    return () => {
      mediaSocket.off('MEET_PEERS', onPeers)
      mediaSocket.off('MEET_PEER_JOINED', onPeerJoined)
      mediaSocket.off('MEET_PEER_LEFT', onPeerLeft)
      mediaSocket.off('MEET_SIGNAL', onSignal)
    }
  }, [joined])

  const joinMeet = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      setJoined(true)
      mediaSocket.sendMeetReady()
    } catch {
      setError('Camera and microphone permission is required to join.')
    }
  }

  const leaveMeet = () => {
    peersRef.current.forEach((peer) => peer.close())
    peersRef.current.clear()
    pendingCandidatesRef.current.clear()
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    setRemotePeers([])
    setJoined(false)
  }

  const toggleTrack = (kind) => {
    const track = localStreamRef.current?.getTracks().find((item) => item.kind === kind)
    if (!track) return
    track.enabled = !track.enabled
    if (kind === 'video') setCameraOn(track.enabled)
    else setMicOn(track.enabled)
  }

  useEffect(() => () => leaveMeet(), [])

  return (
    <section className="meet-box" aria-label="Room meet">
      <div className="meet-header">
        <div>
          <h2>Room meet</h2>
          <span>{joined ? `${remotePeers.length + 1} connected` : 'Audio and video'}</span>
        </div>
        <span className={`meet-status-dot${joined ? ' active' : ''}`} />
      </div>

      {!joined ? (
        <div className="meet-start">
          <p>Join the room call with your camera and microphone.</p>
          <button type="button" onClick={joinMeet}>Join meet</button>
          {error && <small>{error}</small>}
        </div>
      ) : (
        <>
          <div className="meet-grid">
            <div className="meet-tile local">
              <video ref={localVideoRef} autoPlay muted playsInline />
              <span>{participantName} (You)</span>
            </div>
            {remotePeers.map((peer) => <RemoteTile key={peer.id} peer={peer} />)}
          </div>
          <div className="meet-controls">
            <button type="button" onClick={() => toggleTrack('audio')}>{micOn ? 'Mute' : 'Unmute'}</button>
            <button type="button" onClick={() => toggleTrack('video')}>{cameraOn ? 'Camera off' : 'Camera on'}</button>
            <button type="button" className="meet-leave" onClick={leaveMeet}>Leave meet</button>
          </div>
          {error && <small className="meet-error">{error}</small>}
        </>
      )}
    </section>
  )
}

function RemoteTile({ peer }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = peer.stream
  }, [peer.stream])
  return (
    <div className="meet-tile">
      <video ref={videoRef} autoPlay playsInline />
      <span>{peer.name}</span>
    </div>
  )
}

export default MeetBox
