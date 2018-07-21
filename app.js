var app = require('express')();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var io = require('socket.io')(http);
var mongo = require('mongodb').MongoClient;

var user1 = "Rob";
var user2 = "Bonnie";
var messageString = "";

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
var mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL;
var mongoURLLabel = "";

var db = null,
	dbDetails = new Object();

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
	var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
	    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
		mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
		mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
		mongoPassword = process.env[mongoServiceName + '_PASSWORD'],
		mongoUser = process.env[mongoServiceName + '_USER'];
		
	if (mongoHost && mongoPort && mongoDatabase) {
		mongoURLLabel = mongoURL = 'mongodb://';
		if (mongoUser && mongoPassword) {
			mongoURL += mongoUser + ':' + mongoPassword + '@';
		}
		mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
		mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
	}
}

mongo.connect(mongoUrl, {"useNewUrlParser": "true"}, function(err, conn) {
	if (err) throw err;
	db = conn;
	dbDetails.databaseName = db.databaseName;
	dbDetails.url = mongoURLLabel;
	dbDetails.type = 'MongoDB';
	
	
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
			db.collection("users").find(query).toArray(function(err, res) {
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
			db.collection("messages").insertOne(msgObj, function(err, res) {
				if (err) throw err;
			});
			io.sockets.in("1").emit('newmsg', data);
		});
		
		socket.on('joinRoom', function(data) {
			socket.join(data.room);
			obj = { user: data.user, room: data.room };
			db.collection("userrooms").insertOne(obj, function(err, res) {
				if (err) throw err;
			});
		});
	
		socket.on('match', function(data) {
			var matchUser = "";
			db.collection("matching").findOne({}, function (err, res) {
				if (err) throw err;
				if (res.user != "") {
					matchUser = res.user;
				}
			});
			if (matchUser != "") {
				roomNo = maxRoomNo + 1;
				maxRoomNo = roomNo;
				socket.emit('gotmatch', {user: data.user, room: roomNo});
				io.sockets.in("matching").emit('gotmatch', {user: matchUser, room: roomNo});
			} else {
				socket.join("matching");
				obj = {user: data.user};
				db.collection("matching").insertOne(obj, function(err, res) {
					if (err) throw err;
				});
			}
		});
		
		socket.on('getconvo', function(data) {
			query = { room: data.room };
			db.collection("messages").find(query).toArray(function(err, res) {
				if (err) throw err;
				socket.emit("retrievedconvo", res);
			});
		});
		
		socket.on('getconvosbyuser', function(data) {
			query = { user: data.user };
			db.collection("userrooms").find(query).toArray(function(err, res) {
				if (err) throw err;
				socket.emit("gotconvosbyuser", res);
			});
		});
		
		socket.on('getusersbyconvo', function(data) {
			query = { room: data.room };
			db.collection("userrooms").find(query).toArray(function(err, res) {
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
