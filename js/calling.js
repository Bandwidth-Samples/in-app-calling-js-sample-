import {BandwidthUA} from "../node_modules/@bandwidth/bw-webrtc-sdk";

let phone = new BandwidthUA();
let activeCall = null;
let callTo='441138688226';
let token;
let serverConfig = {
    domain: 'sbc.webrtc-app.bandwidth.com',
   // domain: 'gw.webrtc-app.bandwidth.com',
    addresses: ['wss://sbc.webrtc-app.bandwidth.com:10081'],
   // addresses: ['wss://gw.webrtc-app.bandwidth.com:10081'],
    iceServers: ['stun.l.google.com:19302', 'stun1.l.google.com:19302', 'stun2.l.google.com:19302'],
    token: 'eyJraWQiOiJzZ25tLTAzZWI5YWRmLTc2YTktNDU2YS1iMGUxLTkxOGYyMmZkMGU4NiIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJCV0luQXBwQ2FsbGluZyIsImF1ZCI6InZveGJvbmUuY29tIiwic2NwIjpbInZvaWNlLndlYnJ0YyJdLCJyb2xlcyI6W10sImlzcyI6Imh0dHBzOi8vaWQudm94Ym9uZS5jb20vYXBpL3YxIiwiYWNjb3VudHMiOlsiMjA5NTU4Il0sImV4cCI6MTY4NzQzMjIxNywiaWF0IjoxNjg3NDMxNjE3LCJqdGkiOiJhNXVFenQwRnlXMnc0dFpjN0FaTWF5dyJ9.HCXrurcwlt2gINK7aqmZRZZOrHFJW4Wv-RL5U_DH5K_vWuoi6VPdUXIhvwLBfO7i0a0K9Gc-ktbjnpi792ne7wVOgDHk4QCkdQkVN6jEpb2N7nTONjFHp60-WTGTwR06yakKcurSb5daSpfseg1E-fP5K8wzT96Xxs3GXj9WAe5StphgrHTWLGHAUNen0mphRiKGg6YXUVxGwQDzZQWJWG5SeUCGg-L8wcvK6j17-pmHW5i9NEubNDBRPTevSAy_cXeLC3I9hndBPTOpEz6ae-MTwjonyzePdiP9VBaIt1WqRM-0alN74Z1bEVRwV1btDXwocFl0L4Cs9SO_F8lsYQ'
};
let config = {
    // Call
    call: 'Victoria',
    caller: '12345',
    callerDN: '12345',
};

window.onload=documentData();
function documentData() {

    phone.setAcLogger(bw_log);
    phone.setJsSipLogger(console.log);

    bw_log(`------ Date: ${new Date().toDateString()} -------`);
    bw_log(`Bandwidth WebRTC SDK. Simple click-to-call`);
    bw_log(`SDK: ${phone.version()}`);
    bw_log(`SIP: ${JsSIP.C.USER_AGENT}`);


    // Check WebRTC support.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        let noWebRTC = 'WebRTC API is not supported in this browser !';
        guiError(noWebRTC);
        bw_log(noWebRTC);
        return;
    }

   //Get call parameters from URL
    callTo = getParameter('callTo');
    if (callTo === null) {
        let missedCallParameter = 'Missed "call" parameter in URL';
        guiError(missedCallParameter);
        bw_log(missedCallParameter);
        return;
     }

    let server = getParameter('server', null);
    if (server !== null) {
        serverConfig.addresses = [server];
    }
    token = serverConfig.token;

    guiInit();

    phone.checkAvailableDevices()
        .then(() => {
            let caller = getParameter('caller', '+441138688226');
            let callerDN = getParameter('callerDN', '+441138688226');
            initSipStack({ user: caller, displayName: callerDN, password: '' });
        })
        .catch((e) => {
            bw_log('error', e);
            guiError(e);
        })
}

function bw_log() {
    let args = [].slice.call(arguments)
    console.log.apply(console, ['%c' + args[0]].concat(['color: BlueViolet;'], args.slice(1)));
}

function getParameter(name, defValue = null) {
    let s = window.location.search.split('&' + name + '=')[1];
    if (!s) s = window.location.search.split('?' + name + '=')[1];
    return s !== undefined ? decodeURIComponent(s.split('&')[0]) : defValue;
}

function initSipStack(account) {
    console.log("service config",serverConfig);
    console.log("account details",account);
    phone.setServerConfig(serverConfig.addresses, serverConfig.domain, serverConfig.iceServers);
    bw_log('setServerConfig>>> loginStateChanged: passed');

    phone.setAccount(account.user, account.displayName, account.password);
    bw_log('setAccount>>> loginStateChanged: passed');

    phone.setOAuthToken(token, true);
    bw_log('setOAuthToken>>> loginStateChanged: passed');

    // Set phone API listeners
    phone.setListeners({
        loginStateChanged: function (isLogin, cause) {
            switch (cause) {
                case "connected":
                    bw_log('phone>>> loginStateChanged: connected');
                    guiMakeCall(callTo);// after deinit() phone will disconnect SBC.

                    break;
                case "disconnected":
                    bw_log('pone>>> loginStateChanged: disconnected');
                    if (phone.isInitialized())
                        bw_log('pone>>> intialized done: connected');

                        guiError('Cannot connect to SBC server');
                    break;
                case "login failed":
                    bw_log('phone>>> loginStateChanged: login failed');
                    break;
                case "login":
                    bw_log('phone>>> loginStateChanged: login');
                    break;
                case "logout":
                    bw_log('phone>>> loginStateChanged: logout');
                    break;
            }
        },

        outgoingCallProgress: function (call, response) {
            bw_log('phone>>> outgoing call progress');
            document.getElementById('outgoing_call_progress').innerText = 'Call In Progress';
        },

        callTerminated: function (call, message, cause, redirectTo) {
            bw_log(`phone>>> call terminated callback, cause=${cause}`);
            if (call !== activeCall) {
                bw_log('terminated no active call');
                return;
            }


            activeCall = null;
            guiWarning('Call terminated: ' + cause);
            phone.deinit(); // Disconnect from SBC server.
            guiShowPanel('call_terminated_panel');
        },

        callConfirmed: function (call, message, cause) {
            bw_log('phone>>> callConfirmed');
            guiInfo('');
            let remoteVideo = document.getElementById('remote_video');
            let vs = remoteVideo.style;
            vs.display = 'block';
            vs.width = vs.height = call.hasReceiveVideo() ? 'auto' : 0;
            guiShowPanel('call_established_panel');
        },

        callShowStreams: function (call, localStream, remoteStream) {
            bw_log('phone>>> callShowStreams');
            let remoteVideo = document.getElementById('remote_video');
            remoteVideo.srcObject = remoteStream; // to play audio and optional video
        },

        incomingCall: function (call, invite) {
            bw_log('phone>>> incomingCall');
            call.reject();
        },

        callHoldStateChanged: function (call, isHold, isRemote) {
            bw_log('phone>>> callHoldStateChanged ' + isHold ? 'hold' : 'unhold');
        }
    });

    guiInfo('Connecting...');
    phone.init(false);
}

function onBeforeUnload() {
    phone !== null && phone.isInitialized() && phone.deinit();
}

function guiInit() {
    window.addEventListener('beforeunload', onBeforeUnload);
    //document.getElementById('cancel_outgoing_call_btn').onclick = guiHangup;

}

function guiMakeCall(callTo) {
    if (activeCall !== null)
        throw 'Already exists active call';
    document.getElementById('outgoing_call_user').innerText = callTo;
    document.getElementById('outgoing_call_progress').innerText = '';
    document.getElementById('call_established_user').innerText = callTo;
    guiInfo('');
    guiShowPanel('outgoing_call_panel');
    let extraHeaders = [`User-to-User:eyJhbGciOiJIUzI1NiJ9.WyJoaSJd.-znkjYyCkgz4djmHUPSXl9YrJ6Nix_XvmlwKGFh5ERM;encoding=jwt,aGVsbG8gd29ybGQ;encoding=base64`];
    activeCall = phone.call(phone.AUDIO, callTo, extraHeaders);
}

function guiHangup() {
    if (activeCall !== null) {
        activeCall.terminate();
        activeCall = null;
    }
}

//--------------- Status line -------
function guiError(text) { guiStatus(text, 'Pink'); }

function guiWarning(text) { guiStatus(text, 'Gold'); }

function guiInfo(text) { guiStatus(text, 'Aquamarine'); }

function guiStatus(text, color) {
    let line = document.getElementById('status_line');
    line.setAttribute('style', `background-color: ${color}`);
    line.innerHTML = text;

}

function guiShowPanel(activePanel) {
    const panels = ['call_terminated_panel', 'outgoing_call_panel', 'call_established_panel'];
    for (let panel of panels) {
        if (panel === activePanel) {
            guiShow(panel);
        } else {
            guiHide(panel);
        }
    }
}
