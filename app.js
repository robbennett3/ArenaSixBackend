var app = require('express')();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var io = require('socket.io')(http);
var mongo = require('mongodb').MongoClient;
var mongoUrl = "mongodb://localhost:27017/mydb";

var user1 = "Rob";
var user2 = "Bonnie";
var messageString = "";

//app.use(bodyParser.json());

app.get('/', function(req, res) {
	res.sendFile(__dirname + "/" + "index.html");
});

mongo.connect(mongoUrl, {"useNewUrlParser": "true"}, function(err, db) {
	if (err) throw err;
	var dbo = db.db("mydb");
	var query = "";
	var roomNo = 0;
	var maxRoomNo = 0;
	//dbo.createCollection("messages", function(err, res) {
		//if (err) throw err;
		//console.log("Collection created");
	//});
	//query = { name: "Bonnie" };
	//dbo.collection("users").find(query).toArray(function(err, res) {
		//if (err) throw err;
		//console.log(res);
		//db.close();
	//});
	//var obj = { name: "Bonnie" };
	//query = { name: "Rob" };
	//dbo.collection("users").insertOne(query, function(err, res) {
		//if (err) throw err;
		//if (res.name == null) {
			//console.log("Not found");
		//} else {
			//console.log(res[0].name);
		//}
		//db.close();
	//});
	
	io.on('connection', function(socket) {
	
		console.log('A user connected');
		socket.on('setUsername', function(data) {
			//if(users.indexOf(data) > -1) {
				//socket.emit('userExists', data + ' username is taken! Try some other username.');			
			//} else {
				//users.push(data);
				//socket.emit('userSet', {username: data});
			//}
			query = { name: data };
			console.log(query);
			dbo.collection("users").find(query).toArray(function(err, res) {
				if (err) throw err;
				if (res[0].name == null) {
					socket.emit('userNotFound', data + ' user does not exist');
				} else {
					socket.emit('userSet', {username: data});
				}
			});
		});
	
		socket.on('msg', function(data) {
			console.log(data.message);
			var msgObj = { room: data.room, message: data.message, user: data.user, time: data.timestamp };
			dbo.collection("messages").insertOne(msgObj, function(err, res) {
				if (err) throw err;
			});
			io.sockets.in("1").emit('newmsg', data);
		});
		
		socket.on('joinRoom', function(data) {
			socket.join(data.room);
			obj = { user: data.user, room: data.room };
			dbo.collection("userrooms").insertOne(obj, function(err, res) {
				if (err) throw err;
			});
		});
	
		socket.on('match', function(data) {
			var matchUser = "";
			dbo.collection("matching").findOne({}, function (err, res) {
				if (err) throw err;
				if (res.user != "") {
					matchUser = res.user;
				}
			}
			if (matchUser != "") {
				roomNo = maxRoomNo + 1;
				maxRoomNo = roomNo;
				socket.emit('gotmatch', {user: data.user, room: roomNo});
				io.sockets.in("matching").emit('gotmatch', {user: matchUser, room: roomNo});
			} else {
				socket.join("matching");
				obj = {user: data.user};
				dbo.collection("matching").insertOne(obj, function(err, res) {
					if (err) throw err;
				});
			}
		});
		
		socket.on('getconvo', function(data) {
			query = { room: data.room };
			dbo.collection("messages").find(query).toArray(function(err, res) {
				if (err) throw err;
				socket.emit("retrievedconvo", res);
			});
		});
		
		socket.on('getconvosbyuser', function(data) {
			query = { user: data.user };
			dbo.collection("userrooms").find(query).toArray(function(err, res) {
				if (err) throw err;
				socket.emit("gotconvosbyuser", res);
			});
		});
		
		socket.on('getusersbyconvo', function(data) {
			query = { room: data.room };
			dbo.collection("userrooms").find(query).toArray(function(err, res) {
				if (err) throw err;
				socket.emit("gotusersbyconvo", res);
			});
		});
	});
});

app.post('/', function(request, response) {
	console.log(request.body);
	response.send(request.body);
});

http.listen(8080, function() {
	console.log('listening on 3000');
});
