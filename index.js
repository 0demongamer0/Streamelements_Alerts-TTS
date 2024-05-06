function sleep(miliseconds) {
  return new Promise((res) => setTimeout(res, miliseconds));
}

function pUrl(e) {
  try{
    var n = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        , r = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
    var i = e.indexOf("[")
        , o = e.indexOf("]");
    -1 != i && -1 != o && (e = e.substring(0, i) + e.substring(i, o).replace(/:/g, ";") + e.substring(o, e.length));
    for (var a = n.exec(e || ""), s = {}, c = 14; c--; )
      s[r[c]] = a[c] || "";

    const n1 = /^\/(?:TIP_ALERT)\/([0-9a-z\-]+)\//gm;
    let m;
    while ((m = n1.exec(s['relative'])) !== null) {
      if (m.index === n1.lastIndex) {
        n1.lastIndex++;
      }
      return m[1];
    }
    throw new Error("no match");
  } catch (error) {
    console.error(error);
  }
}

var socketS = undefined;
var socketT = undefined;
var loopon = true;
window.onload = () => {
  var cfgG = sat_config;
  const ctx = new AudioContext();
  socketS = io("https://realtime.streamelements.com", {
    transports: ["websocket"],
  });
  //console.log(cfgG.tipply.REACT_APP_ALERT_SOCKET_URL + '/' + pUrl(cfgG.tipply.overlay_url));
  socketT = io(cfgG.tipply.REACT_APP_ALERT_SOCKET_URL + '/' + pUrl(cfgG.tipply.overlay_url), {
    transports: ["websocket"],
  });

  function textToSpeechAsync(voice_config, text) {
    // Limit text length
    text = text.substring(0, voice_config["ttsCharacterLimit"]);
    console.log("TTS text:", text);
    let url;
    let requestOptions;

    if (voice_config["type"] === "elevenlabs") {
      requestOptions = {
        method: "POST",
        headers: {
          "xi-api-key": cfgG.apiKey,
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
    } else if (voice_config["type"] === "streamelements") {
      url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice_config["voiceId"]}&text=${text}`;
    } else {
      throw "TTS type not found";
    }
    let source;
    let wait = true;
    let f = fetch(url, requestOptions);
      f.then((response) => response.arrayBuffer())
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((decodedAudio) => {
        var gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNode.gain.value = voice_config["volume"];
        source = ctx.createBufferSource();
        source.buffer = decodedAudio;
        source.connect(gainNode);
        source.start();
        //if (ctx.state === "suspended") {
        //ctx.resume();
        //}
        //return new Promise(r => source.addEventListener(r, { ended: true }))
        return new Promise((resolve, reject) => {
          source.onended = (e) => {
            wait = false;
            console.log("TTS Audio ended!");
            resolve(e);
          };
        });
        /*source.onended = (e) => {
          console.log("TTS onended");
          oe = new Promise((resolve, reject) => {
            resolve(e);
          });
          //return f;
        };*/
      })
      .then(() => {
        while (wait) sleep(100);
      });
    /*Promise.all([f, oe]).then(() => {
        console.log("TTS all");
        return;
      });*/
  }

  let notifications = [];

  (async () => {
    while (true) {
      if (!loopon) continue;
      if (notifications.length > 0) {
        let notif = notifications.pop();
        //console.log("Notification started", notif);
        let voice_config = cfgG.tts_voices[notif.voiceId];
        if (voice_config && notif.text !== "") {
          console.log("Preparing TTS!");
          try {
            textToSpeechAsync(voice_config, notif.text);
            console.log("TTS is ready, playing...");
          } catch (e) {
            console.log("TTS error:", e);
          }
        }
        console.log("Notification ended");
      }
      await sleep(1000);
    }
  })();

  // Socket connected
  socketS.on("connect", onConnectS);
  socketT.on("connect", onConnectT);
  // Socket got disconnected
  socketS.on("disconnect", onDisconnect);
  socketT.on("disconnect", onDisconnect);
  // Socket is authenticated
  socketS.on("authenticated", onAuthenticated);
  socketT.on("authenticated", onAuthenticated);

  socketS.on("unauthorized", console.error);
  socketT.on("unauthorized", console.error);
  socketS.on("event:test", (data) => {
    console.log(data);
    // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-event
  });
  socketS.on("event", processEventS);
  socketS.on("event:update", (data) => {
    console.log(data);
    // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-session-update
  });
  socketS.on("event:reset", (data) => {
    console.log(data);
    // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-session-update
  });

  socketT.on("alert", (data) => {
    processEventT(data, cfgG.tipply.minimal_amount);
  });

  function processEventS(data) {
    // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-event
    //type: ["merch", "tip", "subscriber", "host", "raid", "cheer"] // twitch events
    if (data.provider !== "twitch") return;
    if (data.data.message === undefined) return;
    for (i = 0; i <= Object.keys(cfgG.tts_voices).length; i++) {
      if (cfgG.tts_voices[i] === undefined) continue;
      var regex = /([^:]+):(.+)/gm;
      const matches = [...data.data.message.matchAll(regex)];
      if (matches.length !== 0) {
        if (cfgG.tts_voices[i].name === matches[0][1]) {
          if (
              Object.values(cfgG.tts_voices[i].alert_type).find(
                  (type) => type === data.type
              )
          ) {
            let notif = {
              title: cfgG.tts_voices[i].name,
              voiceId: i,
              price: data.data.amount,
              user: data.data.username,
              text: matches[0][2],
            };
            console.log(
                `Notification in a queue for ${data.type} using the detected voice name from message: ${matches[0][1]}.`,
                notif
            );
            notifications.push(notif);
            break;
          }
        }
      } else {
        if (
            Object.values(cfgG.tts_voices[i].alert_type).find(
                (type) => type === data.type
            )
        ) {
          let notif = {
            title: cfgG.tts_voices[i].name,
            voiceId: i,
            price: data.data.amount,
            user: data.data.username,
            text: data.data.message,
          };
          console.log(
              `Notification in a queue for ${data.type} using the first found configured voice for it.`,
              notif
          );
          notifications.push(notif);
          break;
        }
      }
    }
  }

  function processEventT(data, amount = 0) {
    console.log(data, amount);
    //type: ["merch", "tip", "subscriber", "host", "raid", "cheer"] // twitch events
    //if (data.provider !== "twitch") return;
    if (data.amount !== 0 && data.amount <= amount && data.amount > 0) return;
    if (data.message === undefined) return;
    let username = data.username !== undefined ? data.username : (data.nickname !== undefined ? data.nickname : "Anonim");
    for (i = 0; i <= Object.keys(cfgG.tts_voices).length; i++) {
      if (cfgG.tts_voices[i] === undefined) continue;
      var regex = /([^:]+):(.+)/gm;
      const matches = [...data.message.matchAll(regex)];
      if (matches.length !== 0) {
        if (cfgG.tts_voices[i].name === matches[0][1]) {
          if (
              Object.values(cfgG.tts_voices[i].alert_type).find(
                  (type) => type === "tip"
              )
          ) {
            let notif = {
              title: cfgG.tts_voices[i].name,
              voiceId: i,
              price: data.amount,
              user: username,
              text: matches[0][2],
            };
            console.log(
                `Notification in a queue for tip using the detected voice name from message: ${matches[0][1]}.`,
                notif
            );
            notifications.push(notif);
            break;
          }
        }
      } else {
        if (
            Object.values(cfgG.tts_voices[i].alert_type).find(
                (type) => type === "tip"
            )
        ) {
          let notif = {
            title: cfgG.tts_voices[i].name,
            voiceId: i,
            price: data.amount,
            user: username,
            text: data.message,
          };
          console.log(
              `Notification in a queue for tip using the first found configured voice for it.`,
              notif
          );
          notifications.push(notif);
          break;
        }
      }
    }
  }

  window.addEventListener('onSessionUpdate', function (obj) {
    const data = obj.detail.session;
    //fancy stuff here
    console.log(data.detail.session);
  });

  function onConnectS() {
    console.log("Successfully connected to the Streamelements websocket!");
    if (cfgG.streamelements.jwt !== undefined) {
      if (cfgG.streamelements.jwt.length !== 0) {
        console.log("Trying to autheticate with jwt...");
        socketS.emit("authenticate", {
          method: "jwt",
          token: cfgG.streamelements.jwt,
        });
      } else console.error("Cannot found streamelements jwt in config file.");
    } else if (cfgG.streamelements.accessToken !== undefined) {
      if (cfgG.streamelements.accessToken.length !== 0) {
        console.log("Trying to autheticate with oauth2...");
        socketS.emit("authenticate", {
          method: "oauth2",
          token: cfgG.streamelements.accessToken,
        });
      } else
        console.error(
          "Cannot found streamelements accessToken in config file."
        );
    }
  }

  function onConnectT() {
    console.log(`Successfully connected to the Tipply websocket using - ${pUrl(cfgG.tipply.overlay_url)} !`);
  }

  function onDisconnect() {
    console.log("Disconnected from websocket");
    // Reconnect
  }

  function onAuthenticated(data) {
    const { channelId } = data;
    console.log(`Successfully connected to channel ${channelId}`);
  }

  document.querySelector("body").addEventListener("click", function () {
    ctx.resume().then(() => {
      console.log("Playback resumed successfully");
    });
  });
};
