var app = require('http').createServer(response);
var fs = require('fs');
var io = require('socket.io')(app);
app.listen(3000);
console.log("App running…");

function response(req, res) {
 fs.readFile(__dirname + '/index.html',
 function (err, data) {
 if (err) {
   res.writeHead(500);
   return res.end('Failed to load file index.html');
 }
 res.writeHead(200);
   res.end(data);
 });
}

function Create2DObjectArray(firstIndexMax,secondIndexMax) {
    var arr = [];
    for (let i=0;i<firstIndexMax;i++) {
        arr[i] = [];
        for(let j=0; j<secondIndexMax; j++)
            arr[i][j] = {};
    }
    return arr;
}

// js % returns negative numbers also, we want only positive; taken from geeksforgeeks
Number.prototype.mod = function(b) { 
      
    // Calculate 
    return ((this % b) + b) % b; 
}

var playersTotal = 2; // CHANGE THIS WHILE TESTING.........................................................................................
var playersConnected = 0;
var socketidlist = [];

var P = {}; // should be identical to P in index.html, remember this when editing while testing............................................
P.xtiles = 4;
P.ytiles = 4;
P.gap = 2; // adjacent cells have gap = 1
P.xlen = P.xtiles*P.gap;
P.ylen = P.ytiles*P.gap;
P.mpp = 4; // men per player
// P.mpp * playersTotal <= P.xtiles * P.ytiles is a necessary condition
P.view = 3; // "view" cells visible +-x and +-y
P.viewgridlen = 2*P.view + 1; // = 7 for now

var H={}; // H does not have a copy in index.html
H.initialhealth = 100;
H.initialenergy = 100; // energy cannot exceed health
H.DashAbsorbDash = {delH: -5, delE: -20};
H.ChargeAbsorbDash = {delH: -5, delE: -20};
H.MoveAbsorbDash = {delH: -5, delE: -20};
H.RestAbsorbDash = {delH: -20, delE: -20};
H.DashIntent = {delH: 0, delE: -20}; // charged for issuing an intent, whether successful or failed

var gameState = {};
gameState.board = Create2DObjectArray(P.ylen,P.xlen);
for(let i=0; i<P.ylen; i++)
    for(let j=0; j<P.xlen; j++)
        gameState.board[i][j].p = -1;
// access as gameState.board[y][x] where x is horizontal distance (column no) and y is vertical distance (row no)
// Origin is top-left corner
// gameState.board[i][j].p and gameState.board[i][j].r
// gameState.board[i][j].p == -1 means empty

gameState.men = Create2DObjectArray(playersTotal,P.mpp);
// access position of r-th man of p-th player as gameState.men[p][r].x and .y
for(let p=0; p< playersTotal; p++)
    for(let r=0; r< P.mpp; r++)
    {
        gameState.men[p][r].health = H.initialhealth;
        gameState.men[p][r].energy = H.initialenergy;
    }
// access health as gameState.men[p][r].health
// access energy as gameState.men[p][r].energy
// health <= 0 for dead man, standard way of checking

var localState = Create2DObjectArray(playersTotal,P.mpp);
for(let p=0; p<playersTotal; p++)
    for(let r=0; r<P.mpp; r++)
        localState[p][r].board = Create2DObjectArray(P.viewgridlen,P.viewgridlen);
// localState[p][r].board[i][j].f = 1 means man, 0 means empty
// localState[p][r].health gives health
// localState[p][r].energy gives energy

var currentMoves = [];
// currentMoves[p][r].type = "m", "d", "c" or "r"
// Dash (d): Executed first, use more energy and move one unit
// Charge (c): Executed second, use more energy to move one unit and deal damage
// Move (m): Executed third, use less energy and move one unit
// Rest (r): Executed last, vulnerable state used to gain health and energy
// currentMoves[p][r].dir = "u", "d", "l" or "r"
var currentMovesCount = 0;


function InitialiseGameState()
{
    for(let p=0; p < playersTotal; p++)
        for(let r=0; r < P.mpp; r++)
        {
            f = true;
            while(f)
            {
                x1 = Math.floor(Math.random()*P.xtiles)*P.gap;
                y1 = Math.floor(Math.random()*P.ytiles)*P.gap;
                if(gameState.board[y1][x1].p == -1)
                {
                    gameState.board[y1][x1].p = p;
                    gameState.board[y1][x1].r = r;
                    gameState.men[p][r].x = x1;
                    gameState.men[p][r].y = y1;
                    f = false;
                }
            }
        }
}

function CalcLocalStates()
{
    for(let p=0; p < playersTotal; p++)
        for(let r =0; r < P.mpp; r++)
        {
            if(gameState.men[p][r].health <= 0) // dead men are blind
                continue;
            for(let i = 0; i < P.viewgridlen; i++)
                for(let j =0; j < P.viewgridlen; j++)
                {
                    let ya = gameState.men[p][r].y;
                    let xa = gameState.men[p][r].x;
                    let yb = (ya + i - P.view).mod(P.ylen);
                    let xb = (xa + j - P.view).mod(P.xlen);
                    if (gameState.board[yb][xb].p >= 0)
                    {
                        localState[p][r].board[i][j].f = 1;
                    }
                    else
                    {
                        localState[p][r].board[i][j].f = 0;
                    }
                }
        }

    for(let p=0; p < playersTotal; p++)
        for(let r =0; r < P.mpp; r++)
        {
            localState[p][r].health = gameState.men[p][r].health;
            localState[p][r].energy = gameState.men[p][r].energy;
        }
}

function delx(s)
{
    if(s == "l")
        return -1
    else if(s == "r")
        return 1
    else return 0;  
}

function dely(s)
{
    if(s == "u")
        return -1
    else if(s == "d")
        return 1
    else return 0;  
}

function kill(p,r)
{
    gameState.men[p][r].health = 0;
    gameState.men[p][r].energy = 0;

    let ya = gameState.men[p][r].y;
    let xa = gameState.men[p][r].x;
    gameState.board[ya][xa].p = -1;
    
    gameState.men[p][r].x = null;
    gameState.men[p][r].y = null;
    
}

function normalise(p,r)
{
    if(gameState.men[p][r].energy < 0)
    {
        gameState.men[p][r].health += gameState.men[p][r].energy;
        gameState.men[p][r].energy = 0;
    }
    else if(gameState.men[p][r].energy > gameState.men[p][r].health)
    {
        gameState.men[p][r].energy = gameState.men[p][r].health;
    }
    else ;

    if(gameState.men[p][r].health <=0)
        kill(p,r);
}

function UpdateGameState()
{
    // write this using gameState (.board, .men etc) and currentMoves (TBW)
    // hopefully this is the only thing left to write
    // AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA !!!!!!!!!!!!!!!!!!!!
    var intent = [];
    for(let i=0; i<P.ylen; i++)
    {
        intent[i] = [];
        for(let j=0; j<P.xlen; j++)
        {
            intent[i][j] = [];
        }
    }
    // intent[i][j][k] gives information about kth man who intends to go to position i,j
    // intent[i][j][k].p
    // intent[i][j][k].r
    // intent[i][j][k].x gives x coordinate where man is, before intent is resolved
    // intent[i][j][k].y gives x coordinate where man is, before intent is resolved
    // a man is not shifted in gameState while his move is still waiting in the intent array

    // issue dash intents
    for(let p=0; p<playersTotal; p++)
        for(let r=0; r<P.mpp; r++)
        {
            if(gameState.men[p][r].health > 0 && currentMoves[p][r].type == "d") // alive and move is dash
            {
                let ya = gameState.men[p][r].y;
                let xa = gameState.men[p][r].x;
                let yb = (ya + dely(currentMoves[p][r].dir)).mod(P.ylen);
                let xb = (xa + delx(currentMoves[p][r].dir)).mod(P.xlen);
                intent[yb][xb].push({p: p, r: r, x: xa, y: ya});
                gameState.men[p][r].health += H.DashIntent.delH;
                gameState.men[p][r].energy += H.DashIntent.delE;
                normalise(p,r);
                
                console.log(ya.toString());
                console.log(xa.toString());
                console.log(yb.toString());
                console.log(xb.toString());
                

            }
        }
    
    // resolve dash intents and execute dashes
    for(let i=0; i< P.ylen; i++)
        for(let j=0; j < P.xlen; j++)
        {
            if(intent[i][j].length > 0) // atleast one man intends to go to i,j (= y,x)
            {
                if(gameState.board[i][j].p != -1) // i,j is occupied
                {
                    // dash fails and deal damage to the occupant of i,j
                    let pa = gameState.board[i][j].p;
                    let ra = gameState.board[i][j].r;
                    if(currentMoves[pa][ra].type == "d")
                    {
                        gameState.men[pa][ra].health += intent[i][j].length * H.DashAbsorbDash.delH;
                        gameState.men[pa][ra].energy += intent[i][j].length * H.DashAbsorbDash.delE;
                    }
                    else if(currentMoves[pa][ra].type == "c")
                    {
                        gameState.men[pa][ra].health += intent[i][j].length * H.ChargeAbsorbDash.delH;
                        gameState.men[pa][ra].energy += intent[i][j].length * H.ChargeAbsorbDash.delE;
                    }
                    else if(currentMoves[pa][ra].type == "m")
                    {
                        gameState.men[pa][ra].health += intent[i][j].length * H.MoveAbsorbDash.delH;
                        gameState.men[pa][ra].energy += intent[i][j].length * H.MoveAbsorbDash.delE;
                    }
                    else if(currentMoves[pa][ra].type == "r")
                    {
                        gameState.men[pa][ra].health += intent[i][j].length * H.RestAbsorbDash.delH;
                        gameState.men[pa][ra].energy += intent[i][j].length * H.RestAbsorbDash.delE;
                    }
                    else ;
                    normalise(pa,ra);
                    intent[i][j].length = 0;
                }
                else // i,j is empty
                {
                    if(intent[i][j].length == 1)
                    {
                        // dash succeeds
                        gameState.board[i][j].p = intent[i][j][0].p;
                        gameState.board[i][j].r = intent[i][j][0].r;
                        let yf = intent[i][j][0].y;
                        let xf = intent[i][j][0].x;
                        let pa = intent[i][j][0].p;
                        let ra = intent[i][j][0].r;
                        gameState.board[yf][xf].p = -1;
                        gameState.men[pa][ra].y = i;
                        gameState.men[pa][ra].x = j;

                        console.log("Dash successful");
                        console.log(i.toString() + j.toString() + yf.toString() + xf.toString() + pa.toString() + ra.toString());
                    }
                    else {
                        // dashes fail
                        intent[i][j].length = 0;
                    }
                }
            }
        }
    // dash execution completed
    

}

function LogBoardState()
{
    var s = " ";
    for(i=0; i<P.ylen; i++)
    {
        s = " ";
        for(j=0; j<P.xlen; j++)
        {
            if(gameState.board[i][j].p == -1)
                s += "  ";
            else
            {
                s += gameState.board[i][j].p.toString();
                s += gameState.board[i][j].r.toString();
            }
        }
        console.log(s);
    }
}

io.on("connection", function(socket) {
    
    if(playersConnected == playersTotal)
        socket.close();
    else
    {
        socketidlist[playersConnected] = socket.id;
        playersConnected++;
        console.log(socketidlist.length);
        console.log(playersConnected.toString());
    }

    if(playersConnected == playersTotal)
    {
        console.log("Initialising gameState ...");
        InitialiseGameState();
        
        console.log("Calculating localState ...");
        CalcLocalStates();
        
        console.log("Emitting localState ...");
        for(let p =0; p< playersTotal; p++)
            io.to(socketidlist[p]).emit("start game", localState[p]);
        
        // console.log(JSON.stringify(gameState,null,4));
        console.log("Start game emitted");
        
        LogBoardState();
    }

    socket.on("Booyah", function(sent_msg, callback) {          // this is the template for receiving an event
        // do stuff here
    });

    socket.on("move", function(move){
        var f = socketidlist.findIndex(function(e){return e==socket.id});

        if(typeof currentMoves[f] === "undefined")
            currentMovesCount++;
        currentMoves[f] = move;
        console.log("Moves received: " + currentMovesCount);

        console.log(JSON.stringify(currentMoves,null,4));

        if(currentMovesCount == playersTotal)
        {
            UpdateGameState();
            CalcLocalStates();
            LogBoardState();
            for(let p =0; p< playersTotal; p++)
                io.to(socketidlist[p]).emit("update state", localState[p]);
            currentMoves.length = 0;
            currentMovesCount = 0; // this is distinct from currentMoves.length, which usually returns largest defined index + 1    
        }
    });

    socket.on("disconnect",function(){
        console.log("Disconnected. Game terminated");
        process.exit(1); // error code 1 and exit
    });

});
