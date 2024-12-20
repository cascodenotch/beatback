class Song {
    constructor(albumImage,artistName,durationMs,songId,songName){
        this.albumImage = albumImage
        this.artistName = artistName;
        this.durationMs = durationMs; 
        this.songId = songId;
        this.songName = songName;
    }

}

module.exports = {Song};