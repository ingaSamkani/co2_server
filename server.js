var mysql = require('mysql');
var bodyParser = require('body-parser')
const morgan = require('morgan')

var PORT = 3000;

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "co2",
  insecureAuth: "true"
});


const express = require('express');
var app = express();

app.use(morgan('short'));

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true
}));

const cors = require('cors');
var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))

// // ===================================================================================================================================

app.get('/configuration', (req, res) => {
	console.log("configuration!!");
	const configuration = {};
	 con.query(`SELECT * FROM gas_results group by(year)`, function (err, result, fields) {	 
		if (err) {
			console.log("FAILED LOAD CONFIGURATION: YEARS");
			res.status(400).send({
				text: 'error has occured',
				error: err,
				result: result
			});
			return;
		}
		configuration.years_back = result.length;
		
		con.query(`SELECT * FROM states`, function (err, result, fields) {
			if (err) {
				console.log("FAILED LOAD CONFIGURATION: ALL STATES");
				res.status(400).send({
				text: 'error has occured',
				error: err,
				result: result
			});
				return;
			}
			configuration.all_states = {};
			result.forEach(item =>{configuration.all_states[item.name] = item.flag_color});
			
			//configuration.all_states = result;
			res.send(configuration);
		});
	});
  });

app.get('/gasList', (req, res) => {
  con.query(`SELECT * FROM gas `, function (err, result, fields) {
    if (err) {
		console.log("FAILED QUERY GAS_LISTS", con);
		res.status(400).send({
			text: 'error ha occured',
			error: err,
			result: result
			});
			return;
	}
    res.send(result);
  });
})

getStandartQueryStr = (body) => {
	let query = 'SELECT year, state,';
  let i = 0;
  body.gases.forEach(gas => {
	  query = query + gas;
	  i++;
	  if (i < body.gases.length) { 
		query+=', ';
	  }
  });
  query += ' from gas_results where year <= ' + body.timeSelection.from + ' and year >= ' + body.timeSelection.to + ' and state in (';
  i = 0;
  body.states.forEach(state => {
	  query += '"' + state + '"';
	  i++;
	  if (i < body.states.length) {
		query+=', ';
	  }
  });
  query+= ')'
  
  return query;
}

setStandartQueryResponse = (response) => {
	const res = {};
	response.forEach(item => {
		const state = item.state.toLowerCase();
		if (!res[state]) {
			res[state] = {};
			
		}
		const stateObj = res[state];
		const yearObj = {};
		stateObj[item.year] = yearObj;
		const keys = Object.keys(item);
		keys.forEach(key => {
			if (!['state', 'year'].includes(key)) {
				yearObj[key] = item[key];
			}
		});
	});
	return res;
}

app.post('/gas_results', (req, res) => {
  const body = req.body;
  console.log(" (** 1 **) REQUEST FOR GAS_RESULTS: ", body);
  const query = getStandartQueryStr(body);
  console.log(" (** 2 **) REQUEST FOR GAS_RESULTS: ", query);
  con.query(query, function (err, result, fields) {
    if (err) {
		console.log("FAILED QUERY GAS_RESULTS", con);
		res.status(400).send({
			text: 'error ha occured',
			error: err,
			result: result
			});
			return;
	}
	console.log("GAS_RESULTS SUCCEED");
	
	
    res.send(setStandartQueryResponse(result));
  });
})

const operators = {
	gt: '>',
	lt: '<',
	eq: '='
}

getComplexQueryStr = (body) => {
	let query = 'SELECT year, state,';
  let i = 0;
  body.gases.forEach(gas => {
	  query = query + gas.name;
	  i++;
	  if (i < body.gases.length) { 
		query+=', ';
	  }
  });
  query += ' from gas_results where year <= ' + body.timeFrame.from + ' and year >= ' + body.timeFrame.to + ' and (';
  i = 0;
  body.gases.forEach(gas => {
	  query = query + ' ' + gas.name + ' ' + operators[gas.operator] + ' ' + gas.value;
	  i++;
	  if (i < body.gases.length) {
		query+= ' ' + gas.connector;
	  }
  });
  query+= ')'
  
  return query;
}

app.post('/gas_complexResults', (req, res) => {
  const body = req.body;
  //console.log('******BODY: \n', body);
  const query = getComplexQueryStr(body);
  console.log(" (** 2 **) REQUEST FOR COMPLEX GAS_RESULTS: ", query);
  con.query(query, function (err, result, fields) {
    if (err) {
		console.log("FAILED QUERY GAS_RESULTS", con);
		res.status(400).send({
			text: 'error ha occured',
			error: err,
			result: result
			});
			return;
	}
	console.log("GAS_RESULTS SUCCEED");
	
	
    res.send(setStandartQueryResponse(result));
  });
})

app.get('/stateList', (req, res) => {
  con.query(`SELECT * FROM states`, function (err, result, fields) {
    if (err) {
		console.log("stateList - FAILED");
		res.status(400).send({
			text: 'error ha occured',
			error: err,
			result: result
			});
			return;
	}
	console.log("stateList SUCCEED");
	const response = {}
	result.forEach(item => {
		if (!response[item.mainland]) {
			response[item.mainland] = {
				name: item.mainland,
				states: []
			}
		}
		response[item.mainland].states.push({name: item.name});
	})
    res.send(response);
  });
})


app.listen(PORT, ()=> {
	console.log("SERVICE IS ON port: " + PORT) 
})
