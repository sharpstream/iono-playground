import "./styles/style.scss";

import moment from "moment";
import momentDurationFormatSetup from "moment-duration-format";
window.moment = moment;

import axios from 'axios';
window.axios = axios;

import VueCircleSlider from 'vue-circle-slider'

new Vue({
    el: '#app',
    components: {
        VueCircleSlider
    },
    data() {
        return {
            volume: 10,
            muteButtonText: 'Mute',
            playButtonText: 'Play',
            player: null,
            playing: false,
            playlist: [],
            duration: null,
            progressBar: null,
            position: "00:00:00",
            events: "",
            currentPlaylistIndex: 0
        }
    },

    watch: {
        volume: function (newVolume) {
            this.player.setVolume(newVolume / 100);
        }
    },

    beforeMount() {
        this.getPlaylist();
    },

    filters: {
        formatDuration(value) {
            if (value === null) {
                return "00:00:00"
            }
            // from seconds to an hh:mm:ss timecode
            return moment.duration(value, "seconds")
                .format("hh:mm:ss", {
                    trim: false
                });
        }
    },
    mounted() {
        let main = () => {
            const player = new iono.Player();
            this.player = player;
            this.player.ready(() => {
                this.progressBar = document.getElementById("progress-bar");
                this.setupEvents();                      // setuo iono player even listeners
                this.player.load(this.playlist);         // load playlist
                this.player.setVolume(this.volume / 100) // set volume to the initial on start
            });
        }
        // Wait for the DOM to load and initialise the player
        window.addEventListener("DOMContentLoaded", main);
    },

    methods: {
        setupEvents() {

            this.player.on("play", () => {
                this.playButtonText = "Pause";
            });

            this.player.on("pause", () => {
                this.playButtonText = "Play";
            });

            // update the volume ui when the playback volume is changed, muted or unmuted
            this.player.on("volumechange", () => {
                this.muteButtonText = this.player.getMute()
                    ? "Unmute"
                    : "Mute";
            });

            this.player.on("seeking", (e) => {
                console.log('seeking');
            });

            this.player.on("playlistselect", () => {
                this.duration = this.player.getDuration();
                this.currentPlaylistIndex = this.player.getPlaylistIndex();
            });

            // update the position on the ui when the current playback position changes
            this.player.on("timeupdate", (event) => {
                this.position = this.$options.filters.formatDuration(event.position);
                this.progressBar.value = event.position / this.duration;
            });

            /*** LOGS ***/
            // listen for tracking events and log them to the console
            this.player.on("tracking", (event) => {
                // action tracking events
                if (event.details.event === "action") {
                    this.events += `TrackingEvent(action): ${
                        event.details.action
                        }\n`;
                }
                // position tracking events
                if (event.details.event === "position") {
                    this.events += `TrackingEvent(position): ${
                        event.details.position
                        }\n`;
                }
            });
            /*** END LOGS ***/
        },

        togglePlay() {
            this.player.togglePlay();
        },

        toggleMute() {
            this.player.toggleMute();
        },

        previousPlaylistItem() {
            if (this.player.previousPlaylistItem()) {
                this.player.setPosition(this.progressBar.offsetX / this.progressBar.offsetWidth * this.duration);
            }
        },

        nextPlaylistItem() {
            if (this.player.nextPlaylistItem()) {
                //  this.player.nextPlaylistItem();
                this.player.setPosition(this.progressBar.offsetX / this.progressBar.offsetWidth * this.duration);
            }
        },

        progressBarClicked() {
            this.player.setPosition(event.offsetX / this.progressBar.offsetWidth * this.duration);
        },

        logInfo() {
            console.log(this.player.getPlaylist());
            console.log(this.player.getPlaylistIndex());
            console.log(this.player.getPlaylistItem());
        },

        playlistItemSelect(index) {
            this.player.selectPlaylistItem(index);
            this.player.play();
        },

        async getPlaylist() {
            let response = await axios.get("./assets/playlist_1.json");
            this.playlist = response.data;
        }

    },
})