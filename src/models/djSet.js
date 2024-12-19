class DjSet {
    constructor(id_set,id_user,titulo,imagen,songs){
        this.id_set = id_set
        this.id_user = id_user;
        this.titulo = titulo; 
        this.imagen = imagen;
        this.songs = songs;
    };
}

module.exports = {DjSet};
