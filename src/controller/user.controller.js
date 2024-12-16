
const getUser = (req, res) =>{ 
    let respuesta = {name: "Pepe", surname: "Garcia"};
    res.send(respuesta);
}

module.exports = {getUser};
