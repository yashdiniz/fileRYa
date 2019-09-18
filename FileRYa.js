/*
	node.js program to perform various complex file operations.
	The first one being: recursive directory traversal to find duplicate files.
	
	author: @yash.diniz;
	PS: As I always say to my future self, "you'll thank me later"...
*/

const conf = {		//this variable allows you to edit the default config
	algo: 'md5',
	key: 'base64',	//key format
	blacklist: true,	//blacklist of files(array of file names, no regex), 'true' means NO BLACKLIST...
	dir: process.cwd(),	//directory to check
	debug: true,	//print the debug statements
	online: false,	//basically, it will show duplicates detected WHILE performing traversal
	nosym: true,	//not follow symlinks
	maxSize: false,	//feature to prevent scanning LARGE files(to save time)(store integer of max size)...
	maxStreams: 1000,	//the streams spawn limit(don't want a buffer overflow!!)
	writeData: true	//write the fileData object...
};

const fs = require('fs');
const path = require('path');

//TODO: A nice manner to navigate and operate on the object after creation.
//		Stand-alone application.

//Counterintuitively, RECURSION IS ASYNCHRONOUS in JS!! Loops are blockling!

var fileData = {};	//this object will store all of the 'files' traversed, with their hash-sums
/*
	The format of saving data to hashes will be as follows:
	The hash-sums of the files will be the key.
	Each value will be an array which will store every subsequent file path with the same hash.
	So,
	{
		...
		'hash':['path1','path2',...]
		...
	}
*/
var queue = [], openStreams = 0;	//queues up all the streams
var addToQueue = (path, ondata, onend) => {	//adds stream events to queue...
	queue.push({
		path: path, datacb: ondata, endcb: onend
	});
};
var runQueue = () => {	//executes the streams in the queue...
	if(queue.length === 0) return;
	var cmd = queue.shift();	//get the stream at top of queue
	if(openStreams < conf.maxStreams) {
		var stream = fs.createReadStream(cmd.path);	//creates the stream
		openStreams++;	//counts the open stream
		stream.on('data', (data)=>{
			cmd.datacb(data);	//callback when data is received
		});
		stream.on('end', ()=>{
			openStreams--;	//decrement at stream close
			cmd.endcb();	//callback at end of stream
			runQueue();	//call runQueue after stream closes
		});
	} else
		queue.unshift(cmd);	//put stream back in queue until stream can be opened...
}

fileData['timestamp'] = {start: new Date()};	//saves a Date object, signifying the RECENCY of the scan
fileData['total'] = 0;	//will save total number of files found

//update():	This function will take the file path, create a stream on the file, 
//			and update the fileData object after finishing reading the stream
//			crypto documentation on Hash
var update = (path,cb)=>{
	var hash = crypto.createHash(conf.algo || 'md5'),	//will find the hash-sum specified at conf.algo (default: md5)
	stat = fs.statSync(path);
	
	++fileData['total'];	//increment the total files scanned

	//BUG:	OS throws errors when too many file streams are opened simultaneously.
	//FIX:	Use a queue to maintain the number of streams opened (github.com/treygriffith/filequeue)
	//		Thank you Trey Griffith(GitHub FileQueue) for the idea!
	addToQueue(path,
		//the data callback
		(data)=>{	//receives chunks of data
			hash.update(data, 'utf8');	//updates the hash object on every chunk
		},
		//the end callback
		()=>{
			var sum = hash.digest(conf.key || 'base64');	//will calculate the sum based on the key and save in format specified at conf.key (default: base64)
			
			if(fileData.hasOwnProperty(sum)) {	//if fileData already has the sum
				//Duplicate found
				fileData[sum].push(path);	//push the file path in the existing array 
				if(conf.debug && conf.online)
					console.log("Duplicate found: ", fileData[sum][0], fileData[sum][fileData[sum].length-1]);	//will post all paths found... During path traversal
			} else {
				fileData[sum] = [];	//create new array
				//an extra feature to save the file size within the tree
				//all files with SAME HASH, are BOUND to have same size
				fileData[sum].push(stat.size);	//size(in bytes) saves only once
				fileData[sum].push(path);	//push the path in the new array
			}

			cb(null,sum);	//eval callback after completing job on stream
		}
	);
};

//walk:		This function will traverse the directories, and call the callback
//			function asynchronously... cb(err) should be a function
//			https://stackoverflow.com/questions/5827612
var walk = (dir,cb)=> {
	var results = [];
	fs.readdir(dir, (err, list)=>{
		if(err) return cb(err);	//returns void, with callback error

		var pending = list.length;	//checks for empty directories
		if(!pending) return cb(null,results);	//returns void, with callback eval

		list.forEach((file)=>{
			var file = path.resolve(dir,file);	//will resolve the full path of file
			fs.stat(file, (err, stat)=>{	//check status of file
				if(err) return cb(err);
				if(stat && (stat.isDirectory() || (!conf.nosym && stat.isSymbolicLink()))	//checks if file is directory, or symlink
					) {	
					walk(file, (err,res)=>{	//will keep recursively traversing
						if(err) return cb(err);
						results = results.concat(res);
						if(--pending == 0) cb(null, results);	//pending has just one element, eval callback...
					});
				} else {	//file is not directory
					//blacklist: will skip files with name.. NO REGEX!
					if((typeof conf.maxSize==='boolean' || stat.size <= conf.maxSize) && 	//feature to skip pushing large files
						(typeof conf.blacklist==='boolean' || (conf.blacklist.length > 0 && !conf.blacklist.find((f)=>{return file.search(f)+1})))
						)
						results.push(file);
					if(--pending == 0) cb(null,results);	//using condition to callback only at end
					//otherwise callback gets called EVERYTIME during recursion!
				}
			});
		});
	});
};

var write = ()=>{
		fs.writeFileSync(path.resolve(conf.dir , 'fileData.json'), JSON.stringify(fileData));	//save object to file for further operations
		if(conf.debug) console.log("Written object to: ", path.resolve(conf.dir , 'fileData.json'));	
}

module.exports = (dir,config)=>{
	if(config) {
		conf.algo = config.algo || conf.algo;	//allows to choose algo and key format
		conf.key = config.key || conf.key;
		conf.debug = config.hasOwnProperty('debug')?config.debug:conf.debug;
		conf.online = config.hasOwnProperty('online')?config.online:conf.online;
		conf.nosym = config.hasOwnProperty('nosym')?config.nosym:conf.nosym;
		conf.writeData = config.hasOwnProperty('writeData')?config.writeData:conf.writeData;
		conf.maxSize = config.maxSize || conf.maxSize;
		conf.blacklist = config.blacklist || conf.blacklist;
		conf.maxStreams = config.maxStreams || conf.maxStreams;
	}
	conf.dir = dir || conf.dir;
	walk(conf.dir , (err,res)=>{	//will run if called as module
		if(err) throw err;
		if(conf.debug) console.log("Number of files: ",res.length);

		var cnt = 0;	//the counter of parallel streams

		if(conf.debug && !conf.online)
			var progress = ()=>{	//displays progress
				var len = Object.keys(fileData).length - 2;
				console._stdout.write('\r' + 
					"Progress: " + Math.round((cnt*100) / fileData['total']) + '%\t' + 
					"Duplicates: " + (100 - Math.round((len*100) / fileData['total'])) + '%\t' + 
					"Originals: " + len + '\t\t\t');
			};

		
		res.forEach((file)=>{
			update(file, (err,sum)=>{	//going to update fileData object for every file in array
				if(++cnt == res.length) {	//will run AFTER all updates have completed
					fileData['timestamp']['end'] = new Date();	//save the time scan completed
					if(conf.writeData) write();	//save the fileData
				}
				if(!conf.online) progress();	//call the progress update function...
			});
		});

		runQueue();	//starts running the streams that have been pushed to queue
	});
	return {
		complete: ()=>{ return fileData['timestamp']['end']-fileData['timestamp']['start'] },	//returns undefined if not complete
		data: fileData,
		duplicates: (tol=1)=>{
			var d = {};
			for(var h in fileData) 
				if(fileData[h].length > tol+1) d[h] = fileData[h];	//will only save duplicates
			return d;
		},
		length: ()=> { return Object.keys(fileData).length - 2 },	//number of originals(excluding first two keys in fileData object, timestamp and total)
		total: ()=> { return fileData['total'] }
	}
};	//exports fileData object if called as a module...

/*
if(require.main===module) {	//if not called as module, will do this walk...
	//stand-alone...
	console.log("Traversing file system...");
}*/