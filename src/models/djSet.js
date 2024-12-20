class DjSet {
    constructor(id_set,id_user,titulo,imagen,id_playlist){
        this.id_set = id_set;
        this.titulo = titulo; 
        this.imagen = imagen;
        this.id_user = id_user;
        this.id_playlist = id_playlist;
    };
}

module.exports = {DjSet};
