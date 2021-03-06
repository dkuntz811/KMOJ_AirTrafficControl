var express = require('express');
var router = express.Router();
var firebase = require('firebase');
var pg = require('pg');
var connectionString = 'postgres://localhost:5432/kmoj';
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({extended: false});
var nodemailer = require ('nodemailer');

router.use(bodyParser.json());

// array to hold all `users`
var user=[];

router.post("/createNewUser", function(req, res){
  firebase.auth().verifyIdToken(req.headers.id_token).then(function(decodedToken) {
    console.log(decodedToken);
    if(decodedToken.email == "test@test.com"){
      console.log("Congrats " + decodedToken.email + "! You added " + req.body.email );
      pg.connect(connectionString, function (err, client, done){
        if (err){
          console.log('error', error);
        }//end if error
        else {
          var queryResults = client.query ('INSERT INTO users (email, permission, name, active) VALUES ($1, $2, $3, $4)', [req.body.email,req.body.permission,req.body.name,req.body.active]
      );//end queryResults

        queryResults.on('end', function(){
          done();
          res.send({success: true});
        });//end queryResults
        }//end else
      });//end pg.connect
    } //end if admin check
    else {
      res.send("You are not authorized to create a new user");
    }//end else
  }).catch(function(error) {
    console.log(error);
    res.send("Error",error);
  });//end error
});//end createNewUser

//get list of users from server
router.get('/userList', function(req,res){
  console.log('in userList');
  //pg connect
  pg.connect( connectionString, function( err, client, done ){
    //if err
    if( err ){
      console.log( 'error: ',err );
    } //end if error connecting
    else{
      console.log( 'connected to database' );
      //clear user array
      user = [];
      // query call to database table
      var queryResults = client.query( 'SELECT * FROM users ORDER BY active DESC, permission ASC;' );
      queryResults.on( 'row', function( row ){
        // runs for each row in the query result
        user.push( row );
      }); // end on row
      queryResults.on( 'end', function(){
        // we're done
        done();
        console.log('user: ',user);
        // return result as a json version of array
        return res.json( user );
      });//end on end
    } // end no error
  }); // end connect
});//end userList

//change active status
router.put('/changeActiveStatus', urlencodedParser, function(req,res){
  console.log('in changeActiveStatus',req.body);
  pg.connect(connectionString, function(err,client,done){
    if(err){
      console.log('error: ',err);
    }//end if
    else{
      console.log('connected to database in changeActiveStatus');
      var resultQuery=client.query('UPDATE users SET active=($1) WHERE id=($2)',[req.body.active,req.body.id]);
      resultQuery.on('end', function(){
        done();
        console.log('in changeActiveStatus active=',req.body.active);
        res.sendStatus(200);
      });//end
    };//end else
  });//end pg connect
});//end changeActiveStatus

//delete task
router.delete('/deleteUser', function(req,res){
  console.log('in deleteUser');
  pg.connect(connectionString, function(err,client,done){
    if(err){
      console.log('error: ',err);
    }//end if
    else{
      console.log('connected to database in deleteUser');
      console.log('Deleted: ', req.body);
      //clear resultArray
      var resultArray = [];
      var resultQuery=client.query('DELETE FROM users WHERE id=($1)',[req.body.id]);
      resultQuery.on('row', function(row){
        resultArray.push(row);
      });//end on row
      resultQuery.on('end', function(){
        done();
        return res.json(resultArray);
      });//end on end
    }//end else
  });//end pg connect
});//end deleteUser

router.get('/pendingContracts', function (req, res){
  console.log('in pendingContracts');
  pg.connect(connectionString, function(err, client, done){
    if(err){
      console.log('error', err);
    } //end if error
    else {
      var results = [];
      var queryResults = client.query ('SELECT * FROM master WHERE man_app=(false)');
      queryResults.on('row', function(row){
        results.push(row);
      });
      queryResults.on('end', function(){
        done();
        // console.log('contract results are', results);
        res.json(results);
      });//end queryResults
    }//end else
  }); //end pg.connect
});//end pendingContracts

router.get('/approvedContracts', function (req, res){
  console.log('in approvedContracts');
  pg.connect(connectionString, function(err, client, done){
    if(err){
      console.log('error', err);
    } //end if error
    else {
      var results = [];
      var queryResults = client.query ('SELECT * FROM master WHERE man_app=(true)');
      queryResults.on('row', function(row){
        results.push(row);
      });
      queryResults.on('end', function(){
        done();
        // console.log('approvedContracts results',results);
        res.json(results);

      });//end queryResults
    }//end else
  }); //end pg.connect
});//end approvedContracts

//change managerApproval
router.put('/managerApproval', urlencodedParser, function(req,res){
  console.log('in managerApproval',req.body);
  pg.connect(connectionString, function(err,client,done){
    if(err){
      console.log('error: ',err);
    }//end if
    else{
      console.log('connected to database in managerApproval');
      var resultQuery=client.query('UPDATE master SET man_app=($1) WHERE id=($2);',[req.body.man_app,req.body.id]);
      resultQuery.on('end', function(){
        ////send email to Production/traffic that new contract is approved/////
        // protraffMail();
        done();
        console.log('in managerApproval man_app=',req.body.man_app);
        res.sendStatus(200);
      });//end
    };//end else
  });//end pg connect
});//end managerApproval

//using superadmin gmail account with following credentials:
//username: kmojatc  password: manager@kmoj
//This is being used as a dummy account for presentation purposes
//Future developer will need to use auth. service to encrypt this info.

//username: kmojatc  password: thepeoplesstation

var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'kmojatc@gmail.com',
		pass: 'manager@kmoj'
	}
});

//This message will be sent to the production and traffic staff @ KMOJ
var protraffMail = function(){
	transporter.sendMail({
	from: 'kmojatc@gmail.com',
	to: 'kmojproject@gmail.com', ///// Change this EMAIL to the PRODUCTION EMAIL/////////
	subject: 'New contract generated!!!',
	text: 'Please complete production and traffic forms for new spot.'
},  function (err, res){
	if (err){
		console.log('error sending mail to traffic and production', err);
	} else {
		// console.log ('message sent', res.message);
	}
	transporter.close();
});
};


module.exports = router;
