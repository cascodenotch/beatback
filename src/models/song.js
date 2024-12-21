class Song {
    constructor(albumImage, artistName, durationMs, songId, songName, danceability, energy, tempo, key) {
        this.albumImage = albumImage;
        this.artistName = artistName;
        this.durationMs = durationMs;
        this.songId = songId;
        this.songName = songName;
        this.danceability = danceability; 
        this.energy = energy;             
        this.tempo = tempo;               
        this.key = key;                   
    }
}

module.exports = { Song };
