function sleep(miliseconds) {
    return new Promise((res) => setTimeout(res, miliseconds));
}

function searchWords(text, wordsToSearch) {
    // Split the text into an array of words
    const wordsInText = text.split(/\s+/);
  
    // Create an object to store the occurrences of each word
    const wordOccurrences = {};
  
    // Iterate through the words in the text
    wordsInText.forEach(word => {
      // Check if the current word is in the list of words to search
      if (wordsToSearch.includes(word)) {
        // Increment the occurrence count for the word
        wordOccurrences[word] = (wordOccurrences[word] || 0) + 1;
      }
    });
  
    return wordOccurrences;
}

window.onload = () => {
    const ctx = new AudioContext();
    const socket = io('https://realtime.streamelements.com', {
        transports: ['websocket']
    });
    //let pong = false;
    //let interval = false;

    async function textToSpeech(voice_config, text) {
        // Limit text length
        text = text.substring(0, voice_config["ttsCharacterLimit"]);
    
        console.log("TTS text:", text);
    
        let url;
        let requestOptions;
        if (voice_config["type"] == "elevenlabs") {
            requestOptions = {
                method: "POST",
                headers: {
                    "xi-api-key": apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: text,
                    model_id: voice_config["modelId"],
                    voice_settings: {
                        stability: voice_config["stability"],
                        similarity_boost: voice_config["similarityBoost"],
                        style: voice_config["style"],
                        use_speaker_boost: voice_config["useSpeakerBoost"],
                    },
                }),
            };
            url = `https://api.elevenlabs.io/v1/text-to-speech/${voice_config["voiceId"]}`;
        } else if (voice_config["type"] == "streamelements") {
            url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice_config["voiceId"]}&text=${text}`;
        } else {
            throw "TTS type not found";
        }
    
        // fetch() returns a promise that
        // resolves once headers have been received
        var response = await fetch(url, requestOptions);
    
        var arrayBuffer = await response.arrayBuffer();
        var decodedAudio = await ctx.decodeAudioData(arrayBuffer);
        var gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNode.gain.value = voice_config["volume"];
        const audio = decodedAudio;
        const source = ctx.createBufferSource();
        source.buffer = audio;
        source.connect(gainNode);
        source.start();
        return new Promise((resolve, reject) => {
            source.onended = resolve;
        });
    }

    let notifications = [];

    (async () => {
        while (true) {
            if (notifications.length > 0) {
                let notif = notifications.pop();
                console.log("Notification started", notif);

                let voice_config = tts_voices[notif.title];
                if (voice_config && notif.text != "") {
                    console.log("Playing TTS");
                    try {
                        await textToSpeech(voice_config, notif.text);
                        console.log("TTS ended");
                    } catch (e) {
                        console.log("TTS error:", e);
                    }
                }
                console.log("Notification ended");
            }
            await sleep(1000);
        }
    })();

    /* function connect() {
        //ws = new WebSocket("wss://pubsub-edge.twitch.tv");
        socket = io('https://realtime.streamelements.com', {
            transports: ['websocket']
        });
        //listen();
    } */
    
    function disconnect() {
        /* if (interval) {
            clearInterval(interval);
            interval = false;
        } */
        ws.close();
    }

    /* function listen() {
        ws.onmessage = (a) => {
            let o = JSON.parse(a.data);
            switch (o.type) {
                case "PING":
                    ws.send(
                        JSON.stringify({
                            type: "PONG",
                        })
                    );
                    break;
                case "PONG":
                    pong = true;
                    break;
                case "RECONNECT":
                    disconnect();
                    connect();
                    break;
                case "RESPONCE":
                    console.log("PubSub responce ", o.error);
                    break;
                case "MESSAGE":
                    switch (o.data.topic) {
                        case `community-points-channel-v1.${channelId}`:
                            let msg = JSON.parse(o.data.message);
                            console.log(msg);
                            switch (msg.type) {
                                case "reward-redeemed":
                                    let reward = msg.data.redemption.reward;

                                    let notif = {
                                        title: reward.title,
                                        price: reward.cost,
                                        user: msg.data.redemption.user.display_name,
                                        text: msg.data.redemption.user_input,
                                    };
                                    console.log("Notification queued", notif);
                                    notifications.push(notif);
                                    break;
                            }
                            break;
                    }
                    break;
            }
        };
        ws.onopen = () => {
            if (testTTSOnLoad) {
                let notif = {
                    title: testTTS,
                    price: 5000,
                    user: "test_user",
                    text: testText,
                };
                console.log("Notification queued", notif);
                notifications.push(notif);
            }

            ws.send(
                JSON.stringify({
                    type: "LISTEN",
                    nonce: "pepega",
                    data: {
                        topics: ["community-points-channel-v1." + channelId],
                        auth_token: "",
                    },
                })
            );
            interval = setInterval(async () => {
                ws.send(
                    JSON.stringify({
                        type: "PING",
                    })
                );
                await sleep(5000);
                if (pong) {
                    pong = false;
                } else {
                    pong = false;
                    disconnect();
                    connect();
                }
            }, 5 * 60 * 1000);
        };
    } */

    // Socket connected
    socket.on('connect', onConnect);
    // Socket got disconnected
    socket.on('disconnect', onDisconnect);
    // Socket is authenticated
    socket.on('authenticated', onAuthenticated);
    socket.on('unauthorized', console.error);
    socket.on('event:test', (data) => {
        console.log(data);
        // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-event
    });
    socket.on('event', (data) => {
        console.log(data);
        // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-event
        //type: ["merch", "tip", "subscriber", "host", "raid", "cheer"] // twitch events
        if(data.provider !== "twitch")
            return;
        if(data.data.message === undefined)
            return;
        let notif = {
            title: "Babka (AI TTS)",
            price: data.data.amount,
            user: data.data.username,
            text: data.data.message,
        };
        switch (data.type) {
            case "tip":
                notif = {
                    title: "Jan (Normal TTS)",
                    price: data.data.amount,
                    user: data.data.username,
                    text: data.data.message,
                };
                break;
            case "subscriber":
                    notif = {
                        title: "Babka (AI TTS)",
                        price: data.data.amount,
                        user: data.data.username,
                        text: data.data.message,
                    };
                break;
        }
        console.log("Notification queued", notif);
        notifications.push(notif);
    });
    socket.on('event:update', (data) => {
        console.log(data);
        // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-session-update
    });
    socket.on('event:reset', (data) => {
        console.log(data);
        // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-session-update
    });

    function onConnect() {
        console.log('Successfully connected to the websocket');
        //socket.emit('authenticate', {method: 'oauth2', token: accessToken});
        socket.emit('authenticate', {method: 'jwt', token: jwt});
    }

    function onDisconnect() {
        console.log('Disconnected from websocket');
        // Reconnect
        disconnect();
    }

    function onAuthenticated(data) {
        const {
            channelId
        } = data;
        console.log(`Successfully connected to channel ${channelId}`);
    }

    //connect();
    document.querySelector('body').addEventListener('click', function() {
        ctx.resume().then(() => {
          console.log('Playback resumed successfully');
        });
      });
};
