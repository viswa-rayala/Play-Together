import { useEffect, useRef, useState, useCallback } from 'react'
import mediaSocket from '../services/mediaSocket'
import '../styles/MeetBox.css'

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

function MeetBox({ participantName, isHost, onClose }) {
  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map())
  const pendingCandidatesRef = useRef(new Map())
  const [joined, setJoined] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [facingMode, setFacingMode] = useState('user')
  const [remotePeers, setRemotePeers] = useState([])
  const [error, setError] = useState('')

  const updatePeer = (peerId, name, stream) => {
    setRemotePeers((current) => {
      const existing = current.find((peer) => peer.id === peerId)
      if (existing) return current.map((peer) => peer.id === peerId ? { ...peer, name, stream } : peer)
      return [...current, { id: peerId, name, stream }]
    })
  }

  const removePeer = useCallback((peerId) => {
    const peer = peersRef.current.get(peerId)
    peer?.close()
    peersRef.current.delete(peerId)
    pendingCandidatesRef.current.delete(peerId)
    setRemotePeers((current) => current.filter((peer) => peer.id !== peerId))
  }, [])

  const leaveMeet = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close())
    peersRef.current.clear()
    pendingCandidatesRef.current.clear()
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    setRemotePeers([])
    setJoined(false)
  }, [])

  const createPeer = useCallback((peerId, peerName, initiator) => {
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
  }, [removePeer])

  useEffect(() => {
    if (joined && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
      localVideoRef.current.play().catch(() => {})
    }
  }, [joined])

  useEffect(() => {
    const onPeers = ({ peers }) => {
      if (!joined) return
      peers.forEach((peer) => createPeer(peer.id, peer.name, true))
    }
    const onPeerJoined = () => {}
    const onPeerLeft = ({ id }) => removePeer(id)
    const onMeetEnded = () => {
      if (joined) leaveMeet()
    }
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
    mediaSocket.on('MEET_ENDED', onMeetEnded)
    return () => {
      mediaSocket.off('MEET_PEERS', onPeers)
      mediaSocket.off('MEET_PEER_JOINED', onPeerJoined)
      mediaSocket.off('MEET_PEER_LEFT', onPeerLeft)
      mediaSocket.off('MEET_SIGNAL', onSignal)
      mediaSocket.off('MEET_ENDED', onMeetEnded)
    }
  }, [joined, createPeer, removePeer, leaveMeet])

  const joinMeet = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      localStreamRef.current = stream
      setJoined(true)
      mediaSocket.sendMeetReady()
    } catch {
      setError('Camera and microphone permission is required to join.')
    }
  }

  const endMeet = () => {
    mediaSocket.sendMeetEnd()
    leaveMeet()
  }

  const toggleTrack = (kind) => {
    const track = localStreamRef.current?.getTracks().find((item) => item.kind === kind)
    if (!track) return
    track.enabled = !track.enabled
    if (kind === 'video') setCameraOn(track.enabled)
    else setMicOn(track.enabled)
  }

  const switchCamera = async () => {
    const currentStream = localStreamRef.current
    if (!currentStream) return

    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user'
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: nextFacingMode } },
        audio: false,
      })
      const nextTrack = nextStream.getVideoTracks()[0]
      const oldTrack = currentStream.getVideoTracks()[0]
      if (!nextTrack) return

      currentStream.removeTrack(oldTrack)
      currentStream.addTrack(nextTrack)
      oldTrack?.stop()
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = currentStream
        localVideoRef.current.play().catch(() => {})
      }
      peersRef.current.forEach((peer) => {
        const sender = peer.getSenders().find((item) => item.track?.kind === 'video')
        sender?.replaceTrack(nextTrack)
      })
      setFacingMode(nextFacingMode)
      setCameraOn(true)
    } catch {
      setError('The other camera is not available on this device.')
    }
  }

  useEffect(() => () => leaveMeet(), [leaveMeet])

  return (
    <section className="meet-box" aria-label="Room meet">
      <div className="meet-header">
        <div className="meet-header-title">
          <h2>
            <span className="meet-header-icon">
              {/* WhatsApp video camera icon */}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M16 7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h11c.55 0 1-.45 1-1v-3.5l4 3.5c.37.33.95.07.95-.42V7.42c0-.49-.58-.75-.95-.42L16 10.5V7z"/>
              </svg>
            </span>
            Video Meet
          </h2>
          <span>{joined ? `${remotePeers.length + 1} connected` : 'Camera & Microphone'}</span>
        </div>
        <div className="meet-header-actions">
          <span className={`meet-status-dot${joined ? ' active' : ''}`} />
          {onClose && (
            <button
              type="button"
              className="meet-close-btn"
              onClick={onClose}
              title="Close Meet panel"
              aria-label="Close Meet"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!joined ? (
        <div className="meet-start">
          <p>Join the room video call with your camera and microphone.</p>
          <button type="button" className="meet-join-btn" onClick={joinMeet}>
            {/* WhatsApp video camera icon same as header button */}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M16 7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h11c.55 0 1-.45 1-1v-3.5l4 3.5c.37.33.95.07.95-.42V7.42c0-.49-.58-.75-.95-.42L16 10.5V7z"/>
            </svg>
            Join Video Call
          </button>
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

            {/* Microphone button — WhatsApp mic icon */}
            <button
              type="button"
              className={`meet-icon-button${micOn ? '' : ' is-off'}`}
              onClick={() => toggleTrack('audio')}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
              title={micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micOn ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.95-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.05 7.44-7 7.93V19h3v2H9v-2h3v-3.07z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                </svg>
              )}
            </button>

            {/* Camera button — WhatsApp video icon */}
            <button
              type="button"
              className={`meet-icon-button${cameraOn ? '' : ' is-off'}`}
              onClick={() => toggleTrack('video')}
              aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
              title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            >
              {cameraOn ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <path d="M16 7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h11c.55 0 1-.45 1-1v-3.5l4 3.5c.37.33.95.07.95-.42V7.42c0-.49-.58-.75-.95-.42L16 10.5V7z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <path d="M21 6.5l-4-4-8 8-1-1-1.41 1.41L9 12.33 3.5 17.83 4.92 19.25l1.51-1.51c.34.16.71.26 1.1.26h9.97c.41 0 .8-.1 1.16-.27.98-.46 1.64-1.46 1.64-2.53V9.5l4 4V6.5zM7.53 17l6.11-6.11 1.32 1.32L13.5 13.5 10.5 16.5H7.53zM3 7.17L2.05 6.22 3.47 4.8l.53.52V6c0 .62.52 1.11 1.14 1l5.74.01-1.42-1.42 1.41-1.41.97.97V17c0 .55-.45 1-1 1H5c-.55 0-1-.45-1-1V7.17z"/>
                </svg>
              )}
            </button>

            {/* Switch Camera button */}
            <button
              type="button"
              className="meet-icon-button"
              onClick={switchCamera}
              aria-label="Switch front and back camera"
              title="Switch front and back camera"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-5.97 14L12 16.9 9.97 19C8.22 19 6.7 17.8 6.2 16.13l1.94-.5c.24.89 1.05 1.54 2 1.54.59 0 1.12-.23 1.52-.61L13.14 18h-.01l-.03-.03L12 16.71l-1.09 1.25.48.48L9.87 19H9.97zM12 7c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zm0 8c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/>
              </svg>
            </button>

            {/* Leave / End call button — WhatsApp phone end icon */}
            {isHost ? (
              <button
                type="button"
                className="meet-leave"
                onClick={endMeet}
                aria-label="End meet for everyone"
                title="End meet for everyone"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.68.28-.28 0-.53-.11-.71-.29L.29 13.08C.11 12.9 0 12.65 0 12.37c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.66c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.25 0-.5-.1-.68-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
              </button>
            ) : (
              <button
                type="button"
                className="meet-leave"
                onClick={leaveMeet}
                aria-label="Leave meet"
                title="Leave meet"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.68.28-.28 0-.53-.11-.71-.29L.29 13.08C.11 12.9 0 12.65 0 12.37c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.66c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.25 0-.5-.1-.68-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
              </button>
            )}
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
