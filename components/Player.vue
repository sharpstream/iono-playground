<template>

    <div class="container">
        <div>

            <!-- Toggle playback button -->
            <button id="toggle-play" type="button" class="btn btn-primary">Play</button>
            <!-- Current position -->
            <span id="position">00:00</span>

            <progress id='progress-bar' class="progress is-primary" value="0"
                max="1"></progress>

            <div class="d-inline-flex align-items-center">
                <!-- Toggle mute button -->
                <button id="toggle-mute" type="button" class="btn mr-2 btn-sm btn-secondary">Mute</button>
                <!-- Volume control slider -->
                <div style="max-width:7.5rem;">
                    <label for="volume" class="mb-0 small text-muted">Volume</label>
                    <input type="range" min="0.0" max="1.0" step="0.1" id="volume"
                        value="1.0" class="custom-range">
                </div>
                <div>
                    <button id="show-now-playing" type="button" class="btn btn-primary">Now
                        Playing</button>
                    <button id="previous-playlist-item" type="button" class="btn btn-primary">Previous
                        Playlist Item</button>
                    <button id="next-playlist-item" type="button" class="btn btn-primary">Next
                        Playlist Item</button>
                    <button id="add-item-to-playlist" type="button" class="btn btn-primary">Add
                        Item To Playlist</button>
                </div>
            </div>
        </div>
        <h6 class="text-muted">Tracking events:</h6>
        <pre class="pre-scrollable"><code id="console"></code></pre>
    </div>
</template>

<script>
//const test = async () => {
//   await Promise.resolve();
//};

export default {
    data() {
        return {};
    },
    mounted() {
        // Wait for the DOM to load and initialise the player
        window.addEventListener("DOMContentLoaded", function main() {
            const player = new iono.Player();
            player.ready(function() {
                // find player ui elements on the DOM
                const $togglePlay = document.getElementById("toggle-play");
                const $position = document.getElementById("position");
                const $volume = document.getElementById("volume");
                const $toggleMute = document.getElementById("toggle-mute");
                const $events = document.getElementById("console");
                const $showNowPlaying = document.getElementById(
                    "show-now-playing"
                );
                const $previousPlaylistItem = document.getElementById(
                    "previous-playlist-item"
                );
                const $nextPlaylistItem = document.getElementById(
                    "next-playlist-item"
                );
                const $addItemToPlaylist = document.getElementById(
                    "add-item-to-playlist"
                );
                const $progressBar = document.getElementById("progress-bar");

                let $duration = null;

                // toggle playback when the toggle button is clicked
                $togglePlay.addEventListener("click", function() {
                    player.togglePlay();
                });

                // toggle playback muting when the toggle mute button is clicked
                $toggleMute.addEventListener("click", function() {
                    player.toggleMute();
                });

                // update playback volume when the volume slider changes
                $volume.addEventListener("change", function(event) {
                    player.setVolume(event.target.valueAsNumber);
                });

                //duration changes (changed track?)
                //$volume.addEventListener("durationchange", function(event) {
                //  $duration = player.getDuration();
                //    console.log(event);
                //});

                // update the toggle button text depending on the paused state
                player.on("play", function() {
                    $togglePlay.textContent = "Pause";
                    $duration = player.getDuration();
                });
                player.on("pause", function() {
                    $togglePlay.textContent = "Play";
                });

                // listen for tracking events and log them to the console
                player.on("tracking", function(event) {
                    // action tracking events
                    if (event.details.event === "action") {
                        $events.textContent += `TrackingEvent(action): ${
                            event.details.action
                        }\n`;
                    }
                    // position tracking events
                    if (event.details.event === "position") {
                        $events.textContent += `TrackingEvent(position): ${
                            event.details.position
                        }\n`;
                    }
                });

                // update the volume ui when the playback volume is changed, muted or unmuted
                player.on("volumechange", function() {
                    $volume.value = player.getVolume();
                    $toggleMute.textContent = player.getMute()
                        ? "Unmute"
                        : "Mute";
                });

                // update the position on the ui when the current playback position changes
                player.on("timeupdate", function(event) {
                    // from seconds to an hh:mm:ss timecode
                    $position.textContent = moment
                        .duration(event.position, "seconds")
                        .format("hh:mm:ss", {
                            trim: false
                        });
                    $progressBar.value = event.position / $duration;
                });

                $progressBar.addEventListener("click", function(evt) {
                    var percent = evt.offsetX / this.offsetWidth;
                    player.setPosition(percent * $duration);
                    this.value = percent / 100;
                });

                $showNowPlaying.addEventListener("click", function() {
                    //console.log(player.getNowPlayingItems()); // <-- Not working!
                    console.log(player.getPlaylist());
                    console.log(player.getPlaylistItem());
                    console.log(player.getPlaylistIndex());
                });

                $previousPlaylistItem.addEventListener("click", function() {
                    player.previousPlaylistItem();
                });

                $nextPlaylistItem.addEventListener("click", function() {
                    player.nextPlaylistItem();
                });

                $addItemToPlaylist.addEventListener("click", function() {
                    player.add({
                        metadata: {
                            contentType: "podcast",
                            uid: "0001",
                            duration: 241,
                            language: "en",
                            title: "Episode 1 short title",
                            description: "Longer episode description string",
                            creator: "Podcaster name",
                            grouping: "Podcast show name",
                            publishDate: `2019-03-24T09:12:09+00:00`,
                            url: "https://example.com/episode-home-page/1",
                            icons: [
                                {
                                    size: "small",
                                    url:
                                        "https://example.com/episode/1/300x300.jpg"
                                },
                                {
                                    size: "medium",
                                    url:
                                        "https://example.com/episode/1/600x600.jpg"
                                }
                            ],
                            banners: [
                                {
                                    size: "medium",
                                    url:
                                        "https://example.com/episode/1/600x200.jpg"
                                }
                            ]
                        },
                        audio: [
                            {
                                url:
                                    "https://download-demo3.sharp-stream.com/Boston%20-%20Pixel%20Station.mp3",
                                bitrate: 64000,
                                quality: "low",
                                filesize: 123000
                                // mime: 'audio/mp3; codecs="mp4a.40.5"'
                            },
                            {
                                url:
                                    "https://download-demo3.sharp-stream.com/Boston%20-%20Pixel%20Station.mp3",
                                bitrate: 128000,
                                quality: "medium",
                                filesize: 456000
                                // mime: 'audio/mp3; codecs="mp4a.40.2"'
                            }
                        ],
                        text: [
                            {
                                kind: "chapters",
                                url: "http://localhost:8000/test.vtt",
                                language: "en"
                            }
                        ],
                        links: [
                            {
                                link: "like",
                                url: "https://example.com/like/1"
                            }
                        ],
                        tags: [
                            {
                                service: "all",
                                name: "media_id",
                                value: "1"
                            },
                            {
                                service: "google",
                                name: "user_id",
                                value: "123"
                            }
                        ],
                        ads: [
                            {
                                position: 0.0,
                                metadata: {
                                    contentType: "ad-client"
                                }
                            }
                        ]
                    });
                });

                axios.get("playlist.json").then(function(response) {
                    player.load(response.data);
                });
            });
        });
    }
};
</script>