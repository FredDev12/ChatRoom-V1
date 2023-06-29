
const path = require('path');
const http = require('http');
const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { 
    userJoin, 
    getCurrentUser, 
    userLeave, 
    getRoomUsers } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// creation de la base de donnée
const sqlite3 = require('sqlite3').verbose();


// Définir le dossier statique
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.json());

const db = new sqlite3.Database('chat_history.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the messages database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,             
            pseudonyme TEXT UNIQUE NOT NULL, 
            username TEXT UNIQUE NOT NULL)        
        `);
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            pseudonyme TEXT NOT NULL, 
            room TEXT NOT NULL, 
            message TEXT NOT NULL, 
            time TEXT DEFAULT '${moment().format('YYYY-MM-DD HH:mm:ss')}'
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS commentaire (
            id INTEGER PRIMARY KEY AUTOINCREMENT,             
            nom TEXT UNIQUE NOT NULL, 
            email TEXT UNIQUE NOT NULL,
            sujet TEXT UNIQUE NOT NULL,
            message TEXT UNIQUE NOT NULL)        
        `);
    }
});

// Configuration du transporteur SMTP pour l'envoi des e-mails
const transporter = nodemailer.createTransport({
    host: 'smtp-mail.outlook.com', // Remplacez par le serveur SMTP approprié
    port: 587, // Remplacez par le port SMTP approprié
    secureConnection: false, // true pour le port sécurisé (ex. 465), false pour le port non sécurisé (ex. 587)
    tls: {
        ciphers: "SSLv3"
    },
    auth: {
        user: 'frederickmk77@outlook.fr', // Remplacez par votre nom d'utilisateur SMTP
        pass: 'Fred123##' // Remplacez par votre mot de passe SMTP
    }
});

const botName = 'Chat bot ';

app.get('/', (req, res) => {
    res.sendFile('index.html');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','login.html'));
});

app.post('/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    console.log(req.body);
    
    // Création de l'e-mail
    const mailOptions = {
      from: 'frederickmk77@outlook.fr',
      to: 'kroosj8@outlook.fr', // Remplacez par votre adresse e-mail de réception
      subject: subject,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };
  
    // Envoi de l'e-mail
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error:', error);
        res.status(500).send('Une erreur s\'est produite lors de l\'envoi de l\'e-mail.');
      } else {
        console.log('Email sent:', info.response);
        res.send('L\'e-mail a été envoyé avec succès.');
      }
    });

    // Insérer les données dans la base de données
    db.run('INSERT INTO commentaire (nom, email, sujet, message ) VALUES (?, ?, ?)', [ name, email, subject, message], (err) => {
        if (err) {
          return console.log(err.message);
        }
        console.log(`Utilisateur "${name}" - "${email}" ajouté à la base de données.`);
      });
});

app.post('/chat.html', (req, res) => {
    const pseudonyme = req.body.pseudonyme.trim().toUpperCase();
    const username = req.body.username.trim().toUpperCase();
  
    // Vérifier que les données entrantes respectent les critères requis
    if (pseudonyme.length < 3 || pseudonyme.length > 20 || username.length < 3 || username.length > 20) {
      return res.status(400).send({ message: 'Les données entrantes ne respectent pas les critères requis.' });
    }
    if (pseudonyme === username) {
        return res.status(400).send({ message: 'Les données entrantes ne respectent pas les critères requis.' });
    }
  
    // Insérer les données dans la base de données
    db.run('INSERT INTO users (pseudonyme, username) VALUES (?, ?)', [ pseudonyme, username], (err) => {
      if (err) {
        return console.log(err.message);
      }
      console.log(`Utilisateur "${pseudonyme}" - "${username}" ajouté à la base de données.`);
  
      // Envoyer une réponse de réussite et une émission d'événement socket.io
      res.status(201).redirect('/login')
    });
});

// Exécuter lorsque le client se connecte
io.on('connection', (socket)=>{
    socket.on('joinRoom', ({pseudonyme, room})=>{
        const user = userJoin(socket.id, pseudonyme.toUpperCase(), room);
    
        socket.join(user.room);
    
        db.get('SELECT pseudonyme FROM users WHERE pseudonyme = ?', [user.pseudonyme], (err, row) => {
            if (err) {
                return next(err);
            }
            if (row) {
                // Utilisateur trouvé, envoyer un message de bienvenue
                socket.emit('message', formatMessage(botName, `Bienvenue ${user.pseudonyme} sur le chat reserver uniquement pour ${room}`));
                console.log(`utilisateur "${user.pseudonyme}" trouvé`);
            } else {
                // Utilisateur non trouvé, rediriger vers la page index.html
                console.log(`utilisateur "${user.pseudonyme}" non trouvé`);
                socket.emit('redirect', '/index.html');
            }
        }); 
        
        // Récupérer tous les messages de la salle actuelle à partir de la base de données
        const up_sql = 'SELECT * FROM messages WHERE room = ?';
        const up_params = [user.room];

        db.all(up_sql, up_params, (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des messages :', err.message);
                return;
            }

            // Envoyer les messages à l'utilisateur qui a émis la demande
            socket.emit('messages', rows);
            console.log(rows);
        });
        

        // Diffuser lorqu'un utilisateur se connecte
        socket.broadcast
            .to(user.room)
            .emit('message', formatMessage(botName, `${user.pseudonyme} - a rejoint le chat ${user.room}`)
        );
    
        // Envoyer des informations aux utilisateurs et à la salle
        io.to(user.room).emit('roomUsers', {
            room: user, 
            users: getRoomUsers(user.room),
            
        });         
        
        // afficher dans la console le username et le room(salle)
        console.log(user);
    });       

    // Ecoutez chatMessage
    socket.on('chatMessage', (msg)=>{
        const user = getCurrentUser(socket.id)
        if (!user) {
            console.error('erreur: utilisateur introuvable');
            return;
        }
       
        // Afficher le message et les informations de l'utilisateur dans la console
        console.log(`Utilisateur ${user.pseudonyme} (${user.id}) dans la salle ${user.room} : ${msg}`);

       // Insérer le message dans la base de données SQLite
        const sql = 'INSERT INTO messages (pseudonyme, room, message) VALUES (?, ?, ?)';
        const params = [user.pseudonyme, user.room, msg];

        db.run(sql, params, function (err) {
            if (err) {
            console.error('Erreur lors de l\'insertion du message :', err.message);
            return;
            }

            // Envoyer le message à tous les utilisateurs dans la même salle (y compris l'utilisateur qui l'a envoyé)
            const message = formatMessage(user.pseudonyme, msg);
            io.to(user.room).emit('message', message);
        });
        
    });

    // Exécuter lorsque le client se déconnecte
    socket.on('disconnect', ()=>{
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit(
                'message', 
                formatMessage(botName, `${user.pseudonyme} - a quitté le chat ${user.room}`)
            );

            // Send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user, 
                users: getRoomUsers(user.room)
            });

        }
    });
})

const PORT = 3002 || process.env.PORT;

server.listen(PORT, ()=>console.log(`Le serveur s'exécute sur le port : ${PORT}`));