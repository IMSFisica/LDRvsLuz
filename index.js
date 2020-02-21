var express = require('express');
var app = express()
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var five = require("johnny-five"),
    board, photoresistor;
var board = new five.Board();

app.use(express.static(__dirname + "/public"));// chama o index.html
app.get('/fila', (req, res)=>{
    res.sendFile(__dirname + '/public/Esperar.html')
})
app.get('/ldr', (req, res)=>{
    res.sendFile(__dirname + '/public/ldr.html')
})
app.get('/10091985', (req, res)=>{
    res.sendFile(__dirname + '/public/admin.html')
})

//############ corpo!!!!#############
board.on("ready", function(){
    //########################## Ativando Johnny-five ###############
    var luz = new five.Led(12);
    var alerta =  new five.Led(13);

    var motor = new five.Motor({
	    pins: {
		pwm: 5,
		dir: 6,
		cdir: 7
	    }
    });
    //comunicação com terminal
    board.repl.inject({
	pot: photoresistor,
	luz:luz,
	alerta: alerta
    });
    
  //########## variaveis da experimentação
    let alertaLuz = 30;
    let ciclos = 25;
    let luzPercentual
    let vetorDados = []
    let users =[]
    let connections = []
    let estadoStart = false;
    let connectionEstado = ['off', 'off']
    let contador = 0;
    let DiaHoje;
    
    i = 0;
    f = 2000;

     //################################ Iniciar o experimento #################################
     io.on('connection', function(socket){
        if(connectionEstado[0] == 'on'){
            socket.emit('sincronizarLuzON');
        }else if (connectionEstado[0] == 'off'){
            socket.emit('sincronizarLuzOff');
        }
        if(connectionEstado[1] == 'on'){
            socket.emit('sincronizarStartOn');
            io.emit('sincronizarLED', { LDR: alertaLuz });
        }

        socket.on('ligar', () => {
            //console.log('o estadoStart: ', estadoStart)
            estadoStart = true;
            //console.log('o estadoStart: ', estadoStart)
            socket.broadcast.emit('sincronizarStartOn');
            connectionEstado[1] = 'on';
	    i = 0;
	    if (i == 0){
		var photoresistor = new five.Sensor({
			pin: "A0",
			freq: f
		});		    
	    }
	    photoresistor.on("data", async function() {
		voltagem = this.fscaleTo(0, 5).toFixed(2);          //converte o valor lido no ldr de 0 a 1024 para volts de 0 a 5 ou "voltagem = (voltLida * 5) / 1024;"
		luzPercentual = this.fscaleTo(0, 100).toFixed(2);   //converte leitura em percentual com 2 casas decimais ou "luzPercentual = (voltLida / 1023) * 100;"
		if (i < ciclos -1){
		    await calcular(voltagem, luzPercentual);        //Função principal
		    await sendData();
		}else if (i == ciclos -1){
		    final();
		    i++;
		}   
	    });  
        });
        socket.on('luzOn', async() => {
            //console.log('luz ligada')
            socket.broadcast.emit('sincronizarLuzON');
            connectionEstado[0] = 'on';
	    luz.on();
        })
        socket.on('luzOff', () => {
            connectionEstado[0] = 'off';
            //console.log('luz desligada')
            socket.broadcast.emit('sincronizarLuzOff');
            connectionEstado[0] = 'off';
	    luz.off();
        })
        //dado do cliente para o server
        socket.on('ValorLED', (event) => {
            alertaLuz = event.vLdr
            console.log(event.vLdr)
            io.emit('sincronizarLED', { LDR: alertaLuz })
        })
	socket.on('DataAtual', (event) => {
            if (DiaHoje != event.Hoje){
		DiaHoje = event.Hoje
		//botar no banco de dados o dia e a utilização;
		
		console.log(event.Hoje)
		//io.emit('sincronizarDATA', { DATA: DiaHoje })
	    }else{
		//adicionar na data existesnte
	    }
	    
        })
	
	socket.on('uping', () => {
	    i = 0;
	    if (i == 0){
		var photoresistor = new five.Sensor({
			pin: "A0",
			freq: f
		});		    
	    }
	    photoresistor.on("data", async function() {
		if(i == 0){
		    await up();
		    i++;
		}if('downing'){
		    
		}
	    }); 

	    
	})
	
	socket.on('downing', () => {
	    i = 0;
	    if (i == 0){
		var photoresistor = new five.Sensor({
			pin: "A0",
			freq: f
		});		    
	    }
	    photoresistor.on("data", async function() {
		if(i == 0){
		    await down();
		    i++;
		}
	    }); 

	
	})

      });

    if (estadoStart == false) {
	motor.stop();
	alerta.off();
	i = 0;
	
    }

    //#####################################################################################
    //############################# Funções do experimento ################################

    async function sleep(forHowLong) {
        function timeout(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        await timeout(forHowLong);
    }
    async function iniciar() {
	motor.forward(180);
	await sleep(130);		
	motor.stop();
	await sleep(1000);

    }
    async function final() {
	motor.reverse(70); 
	await sleep(900);
	motor.stop();
	motor.forward(70);
	await sleep(300);
	motor.stop();
	f = f + 400000;
	alerta.off();

	contador ++;
	console.log("Ciclos de trabalho: " + contador)
        estadoStart = false;

	alertaLuz = 30;
        await io.emit('sincronizarStartOff');
        await io.emit('sincronizarLuzOff');
	await io.emit('sincronizarLED');
        connectionEstado[1] = 'off';
        connectionEstado[0] = 'off';

	alertaLuz = 30;
	luz.off();
	alerta.off();
        
    }

    async function sendData() {
        io.emit('data1', {
            serverNumero: vetorDados[0],
            serverTensao: vetorDados[1],
            serverResistencia: vetorDados[2],
            serverCorrente: vetorDados[3],
            serverLuz: vetorDados[4],
            serverLux: vetorDados[5]
        });

    }
    async function calcular(voltagem, luzPercentual){
        let resistencia;
        let corrente;
        let lux;
        let potencia;
        let exponencial;
	let distancia;

        resistencia = (((5 - voltagem) / voltagem) * 10000)/1000;
        corrente = (voltagem / resistencia);
        exponencial = (-1.505);
        potencia = Math.pow((resistencia), exponencial);
        lux = 2980 * potencia;
	i++;
	distancia = ((i*1.40833 )+ 5)
        
        vetorDados[0] = parseFloat(distancia.toFixed(2))
        vetorDados[1] = voltagem
        vetorDados[2] = parseFloat(resistencia.toFixed(2))
        vetorDados[3] = parseFloat(corrente.toFixed(2))
        vetorDados[4] = luzPercentual
        vetorDados[5] = parseFloat(lux.toFixed(2))

	testeLuminosidade(alertaLuz);
        await iniciar();

        return vetorDados;
    }
    async function testeLuminosidade(alertaLuz) {
        if (luzPercentual < alertaLuz) {
            await sleep(0);
	    alerta.on();
        }
        else {
	    alerta.off();
        }
    }
    
    async function up() {
	motor.forward(180);
	await sleep(130);		
	motor.stop();
	await sleep(1000);
	f = f + 400000;
	await io.emit('StopUp');
	motor.stop();
    }
    async function down() {
	motor.reverse(70);
	await sleep(130);		
	motor.stop();
	await sleep(1000);
	f = f + 400000;
	await io.emit('StopDown');
    }
});

http.listen(8000, function () {
    console.log('Server rodando através da porta *:8000');
});

