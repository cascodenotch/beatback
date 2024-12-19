class Song {
    constructor(albumImage,artistName,durationMs,songI,songName){
        this.albumImage = albumImage
        this.artistName = artistName;
        this.durationMs = durationMs; 
        this.songI = songI;
        this.songName = songName;
    }

}

module.exports = {Song};