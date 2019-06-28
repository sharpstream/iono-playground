import "./styles/style.scss";

import moment from "moment";
import momentDurationFormatSetup from "moment-duration-format";
window.moment = moment;

import axios from 'axios';
window.axios = axios;

import VueCircleSlider from 'vue-circle-slider'
import webvtt from 'node-webvtt';

import iziToast from 'izitoast'// https://github.com/dolce/iziToast
import 'izitoast/dist/css/iziToast.min.css'

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
            duration: '00:00:00',
            progressBar: null,
            position: "00:00:00",
            events: "",
            currentPlaylistIndex: 0,
            bannerImage: null, // banners[0].url
            smallImage: null,  // icons[0].url
            mediumImage: null,  // icons[1].url,
            title: '',
            description: '',
            playbackRate: 1.0,
            language: 'en',
            preload: true,
            textTracksEnabled: true,
            qualityLevel: 'high',
            bufferedPercentage: 0
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
            const player = new iono.Player({
                'language': this.language,
                'playbackRate': this.playbackRate,
                'preload': this.preload, // doesn't work when initially setting it, 
                // 'repeat': 'playlist'
                'textTracksEnabled': this.textTracksEnabled,
                'volume': this.volume / 100,
                'qualityLevel': this.qualityLevel
                //  'analyticsLabel': '<url>',
                //  'analyticsCategory': 'Audio playback',
                //  'analyticsURL': 'https://example.com/submit'
            });
            this.player = player;
            this.player.ready(() => {
                this.setupEvents();
                this.progressBar = document.getElementById("progress-bar");
                // setup iono player even listeners
                this.player.setVolume(this.volume / 100) // set volume to the initial on start
                this.player.setTextTracksEnabled(true);
                this.player.load(this.playlist);         // load playlist
                //  'preload' : true in options above does NOT work!
                //  If used then I do not get -1 issue but playlists don't switch anymore
                //  this.player.setPreload(true); 
            });
        }
        // Wait for the DOM to load and initialise the player
        window.addEventListener("DOMContentLoaded", main);
    },

    methods: {
        setupEvents() {

            this.player.on("play", () => {
                this.playing = true;
                this.playButtonText = "Pause";

                this.smallImage = this.player.getPlaylistItem().metadata.icons[0].url;
                this.mediumImage = this.player.getPlaylistItem().metadata.icons[1].url;
                this.bannerImage = this.player.getPlaylistItem().metadata.banners[0].url;
                this.title = this.player.getPlaylistItem().metadata.title;
                this.description = this.player.getPlaylistItem().metadata.description;

                iziToast.show({
                    id: 'now-playing',
                    title: this.title,
                    message: this.description,
                    displayMode: 'replace',
                    close: false,
                    position: 'topCenter',
                    pauseOnHover: false,
                    image: this.smallImage
                });
            });

            this.player.on("pause", () => {
                this.playing = false;
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
                // BUG?!!: WHILE PAUSED!, moving through playlist from start to finish 2 times first index always returns duration of -1
                // this.player.setPreload(true) fixes it but it is still shouldn't happen!
                // console.log(this.duration);

                // workaround below prevents -1 but causes The provided double value is non-finite. error and need to press play twice to play or go to next playlist
                /*if (this.player.getDuration() === -1) {
                    this.player.load(this.playlist);   // load playlist again
                    this.duration = this.player.getDuration();
                }
                else {
                    this.duration = this.player.getDuration();
                }*/
                // below how it should just work.
                this.duration = this.player.getDuration();
                this.currentPlaylistIndex = this.player.getPlaylistIndex();
            });

            this.player.on("durationchange", () => {
                // Event: duration change always called twice
                console.log('duration changed');
            });

            // update the position on the ui when the current playback position changes
            this.player.on("timeupdate", (event) => {
                this.position = this.$options.filters.formatDuration(event.position);
                this.progressBar.value = event.position / this.duration;
            });

            /*** LOGS ***/
            // listen for tracking events and log them to the console
            this.player.on("tracking", (event) => {

                console.log(event);
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

            this.player.on("texttrackschange", (event) => {
                console.log(event);
            });

            this.player.on("textcuechange", (event) => {
                console.log(event);
            });

            this.player.on("progress", (event) => {
                this.bufferedPercentage = this.player.getBufferedPercentage();
                console.log(event);
            });
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
            else {
                iziToast.info({
                    id: 'playlist',
                    title: 'Beginning of Playlist',
                    displayMode: 'replace'
                });
            }
        },

        nextPlaylistItem() {
            if (this.player.nextPlaylistItem()) {
                this.player.setPosition(this.progressBar.offsetX / this.progressBar.offsetWidth * this.duration);
            }
            else {
                iziToast.info({
                    id: 'playlist',
                    title: 'End of Playlist',
                    displayMode: 'replace'
                });
            }
        },

        progressBarClicked() {
            this.player.setPosition(event.offsetX / this.progressBar.offsetWidth * this.duration);
        },

        async logInfo() {
            await console.log(this.player.getPlaylist());
            await console.log(this.player.getPlaylistIndex());
            await console.log(this.player.getPlaylistItem());
            await console.log(this.player.getTextTracks());
            await console.log(this.player.getChapters()); // ALWAYS returns index 0 chapter (how does this work?)
            await console.log(this.player.getCurrentChapter()); // ALWAYS retuns false (how does this work?)

            // get vtt file contents asynchronously
            if (this.player.getTextTracks().length) {
                let vtt = await axios.get(this.player.getTextTracks()[0]['url']);
                let parsed = webvtt.parse(vtt.data);

                if (parsed.valid) {
                    console.log('VTT LOADED SUCCESSFULLY!');
                    console.log(parsed);
                }
                else {
                    console.log('VTT FAILED TO LOAD!');
                }
            }
            else {
                console.log(`No tracks are available for playlist index: ${this.player.getPlaylistIndex()}`)
            }
        },

        playlistItemSelect(index) {
            this.player.selectPlaylistItem(index);
        },

        async getPlaylist() {
            let response = await axios.get("./assets/playlist.json");
            this.playlist = response.data;
        }

    },
})