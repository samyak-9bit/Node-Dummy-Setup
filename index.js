const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors'); 
const multer = require('multer');
const fs = require("fs");
const path = require("path");
const bodyParser = require('body-parser');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync("public")) {
            fs.mkdirSync("public");
          }
      
          if (!fs.existsSync("public/videos")) {
            fs.mkdirSync("public/videos");
          }
      
          cb(null, "public/videos");
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname); // Set unique filename for each uploaded video
    }
  });
  
  // Create multer instance with defined storage
  const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
      var ext = path.extname(file.originalname);
  
      if (ext !== ".mkv" && ext !== ".mp4") {
        return cb(new Error("Only videos are allowed!"));
      }
  
      cb(null, true);
    },
  });  

const app = express();
const server = http.createServer(app);
const io = socketIo(server,{
    cors:{
        origin: "*"
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());
app.use(multer().single('video'));
app.use(bodyParser.json());

// Store registered users in memory (mock database)
let users = [
    {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        isSuperUser: false
    },
    {
        _id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password456',
        isSuperUser: true
    },
    {
        _id: '3',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'alice123',
        isSuperUser: false
    },
    {
        _id: '4',
        name: 'Bob Brown',
        email: 'bob@example.com',
        password: 'bob456',
        isSuperUser: false
    },
    {
        _id: '5',
        name: 'Charlie Davis',
        email: 'charlie@example.com',
        password: 'charlie789',
        isSuperUser: false
    },
    {
        _id: '6',
        name: 'Emma White',
        email: 'emma@example.com',
        password: 'emma456',
        isSuperUser: true
    },
    {
        _id: '7',
        name: 'David Lee',
        email: 'david@example.com',
        password: 'david123',
        isSuperUser: false
    },
    {
        _id: '8',
        name: 'Olivia Wilson',
        email: 'olivia@example.com',
        password: 'olivia456',
        isSuperUser: false
    },
    {
        _id: '9',
        name: 'Ethan Moore',
        email: 'ethan@example.com',
        password: 'ethan123',
        isSuperUser: false
    },
    {
        _id: '10',
        name: 'Sophia Taylor',
        email: 'sophia@example.com',
        password: 'sophia456',
        isSuperUser: true
    }
];

// Route for handling user registration
app.post('/register', (req, res) => {
    const { name, email, password, isSuperUser } = req.body;

    // Generate unique _id using Date.now()
    const _id = Date.now().toString();

    // Mock user registration (simply adding to array)
    const newUser = { _id, name, email, password, isSuperUser };
    users.push(newUser);

    // Emit notification to all connected clients
    io.emit('newUser', {
        message: 'New User Added.',
        newUserEmail: newUser.email
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser });
    console.log(users);
});

// Route for handling DELETE requests to delete a user
app.delete('/users/:id', (req, res) => {
    const userId = req.params.id;

    // Find index of user with provided _id
    const index = users.findIndex(user => user._id === userId);

    if (index !== -1) {
        // Remove user from array
        const deletedUser = users.splice(index, 1)[0];
        res.status(200).json({ message: 'User deleted successfully', user: deletedUser });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// Route for handling PUT requests to update a user
app.put('/users/:id', (req, res) => {
    const userId = req.params.id;
    const { name, email, password, isSuperUser } = req.body;

    // Find index of user with provided _id
    const index = users.findIndex(user => user._id === userId);

    if (index !== -1) {
        // Update user's properties
        users[index] = { ...users[index], name, email, password, isSuperUser };
        res.status(200).json({ message: 'User updated successfully', user: users[index] });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// Route for handling user login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = users.find(user => user.email === email);

    if (user) {
        // Check if the password matches
        if (user.password === password) {
            // Password matches, respond with success status
            res.status(200).json({ message: 'Login successful', user: user });
        } else {
            // Password doesn't match, respond with unauthorized status
            res.status(401).json({ message: 'Incorrect password' });
        }
    } else {
        // User not found, respond with not found status
        res.status(404).json({ message: 'User not found' });
    }
});
  
  // Route for handling video uploads
app.post('/uploadVideo', upload.single('video'), (req, res) => {
    // Uploaded video file is available in req.file
    const videoPath = req.file.path;
    console.log('Video uploaded successfully:', videoPath);
    res.status(200).json({ message: 'Video uploaded successfully', videoPath: videoPath });
  });


app.get('/users', (req, res) => {
    // Return the list of users
    res.json(users);
});


// Assuming 'audio' folder exists
const audioFolderPath = path.join(__dirname, 'audio');


// Socket.io connection event
io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    socket.on('startRecording', () => {
      console.log('Started Recording.')
        // Create a unique filename based on timestamp
        const fileName = `recording_${Date.now()}.wav`;
        const filePath = path.join(audioFolderPath, fileName);
    
        // Create a write stream
        const writeStream = fs.createWriteStream(filePath);
    
        // Event listener for error handling
        writeStream.on('error', (err) => {
            console.error('Error occurred while writing audio file:', err);
        });
    
        // Event listener for stream finish
        writeStream.on('finish', () => {
            console.log('Audio recording saved:', fileName);
            // Optionally, you can emit an event or perform any other action here
        });
    
        // Event listener for new data
        socket.on('newData', (data) => {
          if (data && data.data) {
            // Write data to the stream
            writeStream.write(data.data);
            console.log(data);
        } else {
            console.error('Invalid data received:', data);
        }
        });
    
        // Event listener for stop recording
        socket.on('stopRecording', () => {
            // Stop the stream
            writeStream.end();
            console.log('Stopped recording');
        });
    });

    // Event listener for disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});



// Route for handling GET requests to the root URL
app.get('/', (req, res) => {
    res.send('Hello, this is the root URL!');
});


// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});





// const express = require('express');
// const multer = require('multer');
// const bodyParser = require('body-parser');

// const app = express();
// app.use(bodyParser.json());

// const storage = multer.diskStorage({
//   destination(req, file, callback) {
//     callback(null, './videos');
//   },
//   filename(req, file, callback) {
//     callback(null, `${file.fieldname}_${Date.now()}_${file.originalname}`);
//   },
// });

// const upload = multer({ storage });

// app.get('/', (req, res) => {
//   res.status(200).send('You can post to /api/upload.');
// });

// app.post('/api/upload', upload.array('video', 3), (req, res) => {
//   console.log('file', req.files);
//   console.log('body', req.body);
//   res.status(200).json({
//     message: 'success!',
//   });
// });

// app.listen(process.env.PORT || 3000, () => {
//   console.log(
//     `server is running at http://localhost:${process.env.PORT || 3000}`
//   );
// });