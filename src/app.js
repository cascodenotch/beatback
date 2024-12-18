require('dotenv').config(); // Asegúrate de esto esté al principio
const express = require("express")
const cors = require('cors')
const helmet = require('helmet');
const userRouters = require("./routers/user.routers")
const songRouters = require("./routers/song.routers")
const setRouters = require("./routers/set.routers")
const spotifyRouters = require("./routers/spotify.routers")
const errorHandling = require("./error/errorHandling")

const app = express();
 
app.set("port", process.env.PORT || 3000)

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "blob:"],
    // Otras directivas que necesites
  }
}));
app.use(userRouters);
app.use(songRouters);
app.use(setRouters);
app.use(spotifyRouters)
app.use(function(req, res, next)
    {
        res.status(404).json({error:true, codigo: 404, message: "Endpoint doesnt found"})
    })

app.use(errorHandling);

module.exports = app;