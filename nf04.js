'use strict';
//This declares to JSHint that $ and codemirror are global variable, and the false indicates that it should not be overridden.
	/* global $:false, CodeMirror:false */
$(function () {
	//init control bar button - Check for the various File API support.
	if (window.File && window.FileReader)
	{
		$('.btn-open').parent().removeClass('disabled');
	}
	else
	{
		$('.btn-open').tooltip({
			'html':true,
			'title': 'Votre navigateur n\'est pas compatible avec cette option. <br/>Mettez-le à jour ou utilisez en un autre !',
			'container': 'body'
		});
	}

	//interpreter object
	function NF04()
	{
		this.init = function()
		{
			//(re)init buttons
			$('.btn-pause').addClass('btn-start');
			$('.btn-pause').html('<span class="glyphicon glyphicon-play"></span> Lancer');
			$('.btn-pause').removeClass('btn-pause');
			$('.btn-next').removeAttr('disabled');
			$('.btn-start').removeAttr('disabled');
			//init vars
			this.mode = 0;
			this.varsTypes = [];
			this.varsNames = [];
			this.varsValues = [];
			this.varsLastValues = [];
			this.line = 0;
			this.traceCount = 0;
			this.traceScreenLine = -1;
			this.tooltipMsgs = [];
			this.inputSubmited = false;
			this.inputCreated = false;
			this.inputValue = '';
			this.loopMode = false;
			this.controlFlow = [];
			//set trace and output
			$('#sortie').html('');
			$('#trace').html('<thead><tr><th>&nbsp;</th></tr></thead><tbody></tbody>');
			//Setup editor
			this.editor = CodeMirror.fromTextArea(document.getElementById('code'),
			{
				lineNumbers: true,
				styleActiveLine: true,
				matchBrackets: true,
				theme: 'pastel-on-dark',
				gutters: ['CodeMirror-linenumbers', 'errorMark', 'actualLineMark']
			});

		};
		// and init !
		this.init();

		//Update all tooltips
		this.updateTooltips = function()
		{
			var editor = this.editor;
			$.each(this.tooltipMsgs,function(index, value){
				editor.addLineClass(index, 'wrap', 'tooltip-msg tooltip-msg-' + index);
				$( '.tooltip-msg-' + index ).tooltip({
					'html':true,
					'title':value,
					'container': 'body'
				});
			});
		};
		//add error mark on editor
		this.addError = function(line, message, isWarning)
		{
			isWarning = (typeof isWarning !== 'undefined' )? isWarning : false;
			
			//add colored disc next to the line number
			var marker = document.createElement('div');
			marker.innerHTML = '●';
			if(isWarning)
			{
				marker.style.color = 'orange';
				this.editor.addLineClass(line, 'background', 'warningBg');
				$('#sortie').append('<li class="list-group-item list-group-item-warning"><u>Ligne ' + (line+1) + '</u> : ' + message + '</li>');

			}
			else
			{
				this.editor.removeLineClass(line, 'background', 'warningBg');
				marker.style.color = 'red';
				this.editor.addLineClass(line, 'background', 'errorBg');
				$('#sortie').append('<li class="list-group-item list-group-item-danger"><u>Ligne ' + (line+1) + '</u> : ' + message + '</li>');
				//stop ui except reset button
				this.editor.removeLineClass(line, 'background', 'actualLine');
				this.line = -1;
				this.loopMode = false;
				$('.btn-start').attr('disabled','disabled');
				$('.btn-pause').attr('disabled','disabled');
				$('.btn-next').attr('disabled','disabled');
				$('.btn-submit').attr('disabled','disabled');

				this.disableEditor(false);
			}
			this.editor.setGutterMarker(line, 'errorMark', marker);
			
			//Set tooltip
			this.tooltipMsgs[line] = message;
			this.updateTooltips();
		};

		this.setActualLine = function(line)
		{
			//Remove old actual line
			for (var j = 0; j < this.editor.lineCount() ; j++)
			{
				this.editor.removeLineClass(j, 'background', 'actualLine');
			}
			this.editor.clearGutter('actualLineMark');

			//set Actual line style
			if(line != -1)
			{
				this.editor.addLineClass(line, 'background', 'actualLine');

				var marker = document.createElement('div');
				marker.innerHTML = '>';
				marker.style.color = '#6faedf';
				this.editor.setGutterMarker(line, 'actualLineMark', marker);
				//scroll
				var elementHeight = Math.round($('.CodeMirror-vscrollbar').children('div').height() / this.editor.lineCount());
				//If the element is below the view
				if($('.CodeMirror-vscrollbar').scrollTop() < (elementHeight*(line+1) - $('.CodeMirror').height() + 5)) {
					$('.CodeMirror-vscrollbar').scrollTop(elementHeight*(line+1) - $('.CodeMirror').height() + 5);
				}
				//else if the element is above
				else if($('.CodeMirror-vscrollbar').scrollTop() > elementHeight*line ) {
					$('.CodeMirror-vscrollbar').scrollTop(elementHeight*line);
				}
			}

			this.updateTooltips();
		};


		this.executeExpression = function(expressionString, quotes)
		{
			quotes = (typeof quotes !== 'undefined' )? quotes : true;
			//To array
			var oldExpressionString = expressionString;
			var out = [];
			var buffer = '';
			var parenthesesLevel = 0;
			var stringMode = false;
			for (var i = 0; i < expressionString.length; i++)
			{
				//whitespaces
				if(!stringMode && /^\s$/.test(expressionString[i]))
				{
					if(buffer !== '')
					{
						out[out.length] = {};
						out[out.length-1].value = buffer;
						buffer = '';
					}
				}
				// Operators chars that will break any var name or function or anything except stringmode
				else if(!stringMode && '+-*/%=!<>'.indexOf(expressionString[i]) != -1)
				{
					//Save buffer
					if(buffer !== '')
					{
						out[out.length] = {};
						out[out.length-1].value = buffer;
						buffer = '';
					}

					//check the char after this one to know if it's a two-char operator
					if(expressionString[i+1] !== undefined && $.inArray((expressionString[i]+expressionString[i+1]), ['!=','<=','>=']) != -1)
					{
						out[out.length] = {};
						out[out.length-1].value = (expressionString[i] + expressionString[i+1]);
						i++;
					}
					else
					{
						out[out.length] = {};
						out[out.length-1].value = expressionString[i];
					}
				}
				else if(!stringMode && expressionString[i] == '(')
				{
					if(buffer !== '')
					{
						if(buffer.toLowerCase() == 'ou' || buffer.toLowerCase() == 'et')
						{
							out[out.length] = {};
							out[out.length-1].value = buffer;
							out[out.length] = {};
							out[out.length-1].value = '(';
						}
						else
						{
							out[out.length] = {};
							out[out.length-1].value = buffer + '(';
						}
						buffer = '';
					}
					else
					{
						out[out.length] = {};
						out[out.length-1].value = '(';
					}
					parenthesesLevel++;
				}
				else if(!stringMode && expressionString[i] == ')')
				{
					if(buffer !== '')
					{
						out[out.length] = {};
						out[out.length-1].value = buffer;
						buffer = '';
					}
					parenthesesLevel--;
					out[out.length] = {};
					out[out.length-1].value = ')';
					//TODO exit and error if < 0
				}
				else if(expressionString[i] == '\'' || expressionString[i] == '"')
				{
					if(!stringMode)
					{
						//save buffer
						if(buffer !== '')
						{
							out[out.length] = {};
							out[out.length-1].value = buffer;
						}
						//enter in string mode
						stringMode = expressionString[i];
						buffer = expressionString[i];
					}
					else
					{
						//Check if this is the good string char ' or " AND test if the end char is not escaped with \
						if(expressionString[i] == stringMode && i >= 1 && expressionString[i-1] != '\\')
						{
							//Quit string mode
							out[out.length] = {};
							out[out.length-1].value = buffer + expressionString[i];
							buffer = '';
							stringMode = false;
						}
					}
				}
				else
				{
					buffer += expressionString[i];
				}


			}

			//Save final buffer
			if(buffer !== '')
			{
				out[out.length] = {};
				out[out.length-1].value = buffer;
				buffer = '';
			}

			//look at value and check if all cell are known types and replace vars
			for (i = 0; i < out.length; i++)
			{
				var temp;
				if((temp = this.getType(out[i].value, quotes)))
				{
					out[i] = temp;
				}
				else
				{
					this.addError(this.line, 'Expression source du problème : <strong>' + oldExpressionString + '</strong>. <br/> Transformé en <strong>' + this.expressionString(out) + '</strong>.');
					return false;
				}
			}

			//If there is there is - or + without value at left, just add zero
			for (i = 0; i < out.length; i++)
			{
				if((out[i].value == '-' || out[i].value == '+') && (out[i-1] === undefined || (out[i-1].categorie != 'value' && out[i-1].categorie != ')')))
				{
					out.insert(i,{});
					out[i].value = 0;
					out[i].type = 'entier';
					out[i].categorie = 'value';
				}
			}

			//Calculate
			var result = this.evaluateExpression(out);
			if(!result)
			{
				this.addError(this.line, 'Expression source du problème : <strong>' + oldExpressionString + '</strong>. <br/> Transformé en <strong>' + this.expressionString(out) + '</strong>.');
				return false;
			}
			return result;
		};

		this.getType = function(value)
		{
			var out = {};
			var matches;
			out.value = value;
			if(value == '(' || value == ')')
			{
				out.categorie = value;
				out.type = value;
			}
			else if((matches = value.match(/^([a-z0-9_]+)\($/i)) !== null) //Function
			{
				out.categorie = 'function';
				out.type = 'function';
				out.value = matches[1].toLowerCase();
				if(matches[1].toLowerCase() != 'e' && matches[1].toLowerCase() != 'non')
				{
					this.addError(this.line, 'La fonction ou le sous-algorithme <strong>' + matches[1] + '</strong> n\'existe pas.');
					return false;
				}
			}
			else if(value.match(/^([0-9]+)$/i) !== null) //Entier
			{
				out.value = parseInt(value,10);
				out.categorie = 'value';
				out.type = 'entier';
			}
			else if(value.match(/^0x([0-9a-f]+)$/i) !== null) //Entier hexadécimal
			{
				out.value = parseInt(value,16);
				out.categorie = 'value';
				out.type = 'entier';
			}
			else if(value.match(/^([0-9,\.]+)$/i) !== null) //Réel
			{
				out.value = parseFloat(value.replace(',','.'));
				out.categorie = 'value';
				out.type = 'réel';
			}
			else if(value.match(/^(\*|\/|%)$/i) !== null) //Operator level first
			{
				out.categorie = 'operator';
				out.type = 1;
			}
			else if(value.match(/^(\+|-)$/i) !== null) //Operator level second
			{
				out.categorie = 'operator';
				out.type = 2;
			}
			else if(value.match(/^(=|!=|<=|>=|<|>)$/i) !== null) //Operator third second
			{
				out.categorie = 'operator';
				out.type = 3;
			}
			else if(value.match(/^(ET|OU)$/i) !== null) //Operator level fourth
			{
				out.categorie = 'operator';
				out.type = 4;
			}
			else if((matches = value.match(/^"([^"]*)"$/i)) !== null) //String : temp type, i will remove it after array implementation TODO
			{
				out.categorie = 'value';
				out.type = 'string';
				out.value = matches[1];
			}
			else if((matches = value.match(/^'(\\?[^']*)'$/i)) !== null) //Caractère
			{
				if(matches[1].length >= 2){
					this.addError(this.line, 'La valeur <strong>' + value + '</strong> du type <strong>caractère</strong> contient plus d\'un caractère. Elle sera donc tronquée.',true);
				}
				out.value = matches[1][0];
				out.categorie = 'value';
				out.type = 'caractère';
			}
			else if(value.match(/^(Vrai|Faux)$/i) !== null) //booléen
			{
				out.value = (value.toLowerCase() == 'vrai');
				out.categorie = 'value';
				out.type = 'booléen';
			}
			else if((matches = value.match(/^([a-z0-9_]+)$/i)) !== null) //Variable
			{
				//Get type
				if(this.varsTypes[matches[1]] === undefined)
				{
					this.addError(this.line, 'La variable <strong>' + matches[1] + '</strong> n\'est pas définie');
					return false;
				}
				out.categorie = 'value';
				out.type = this.varsTypes[matches[1]];
				
				//Get value
				if(this.varsValues[matches[1]] === undefined)
				{
					this.addError(this.line, 'La variable <strong>' + matches[1] + '</strong> n\'a pas de valeur',true);
					//Set default value
					if(this.varsTypes[matches[1]] == 'booléen'){
						out.value = 'Faux';
					}
					else {
						out.value = 0;
					}
				}
				else {
					out.value = this.varsValues[matches[1]];
				}
			}
			else
			{
				this.addError(this.line, 'Je ne comprend pas la signification de cet enchainement de caractères : <strong>' + value + '</strong>.');
				return false;
			}
			return out;
		};

		this.evaluateExpression = function (expressionObject)
		{
			var input = expressionObject;
			var i;
			//console.log(this.expressionString(input));
			//Remove () if they are useless
			if((input[0].categorie == '(' || input[0].categorie == 'function') && input[input.length-1].categorie == ')')
			{
				//Test if first and last parenthese are together
				var deleteThem = true;
				var level = 0;
				for (i = 0; i < input.length; i++)
				{
					if(input[i].categorie == '(' || input[i].categorie == 'function'){
						level++;
					}
					if(input[i].categorie == ')'){
						level--;
					}
					if(level === 0 && i != input.length-1)
					{
						deleteThem = false;
						break;
					}
				}
				if(deleteThem)
				{
					if(input[0].categorie == '('){
						input.shift();
						input.pop();
					}
					else if(input[0].categorie == 'function')
					{
						//TODO fix the problem of , considered as decimal separator everytime, and considere it as parameters separator
						var funcName = input[0].value;
						input.shift();
						input.pop();
						return this.executeFunction(funcName, input);
					}
				}
			}

			//If only one value
			if(input.length == 1 && input[0].categorie == 'value')
			{
				return input[0];
			}

			//Find the operation with less priority
			var lastType;
			var lastTypeI;
			var lowestOperatorLevel = 0;
			var lowestOperatorI = -1;
			var parentheseLevel = 0;
			for (i = input.length - 1; i >= 0; i--)
			{
				//Check operator/value alternation
				if(input[i].categorie == 'value' && lastType == 'value')
				{
					this.addError(this.line, 'J\'essaye de calculer cette expression : <strong>' + this.expressionString(input) + '</strong> mais j\'ai trouvé deux valeurs qui se suivent <strong>' + this.valueobjToString(input[i]) + '</strong> et <strong>' + this.valueobjToString(input[lastTypeI]) + '</strong> alors que toutes les valeurs doivent être séparés par un opérateur.');
					return false;
				}
				if(input[i].categorie == 'operator' && lastType == 'operator')
				{
					this.addError(this.line, 'J\'essaye de calculer cette expression : <strong>' + this.expressionString(input) + '</strong> mais j\'ai trouvé deux opérateurs qui se suivent <strong>' + this.valueobjToString(input[i]) + '</strong> et <strong>' + this.valueobjToString(input[lastTypeI]) + '</strong> alors que tous les opérateur doivent être séparés par une valeur.');
					return false;
				}
				if(input[i].categorie == 'value' || input[i].categorie == 'operator')
				{
					lastType = input[i].categorie;
					lastTypeI = i;
				}
				//Find the operation with less priority
				if(input[i].categorie == '(' || input[i].categorie == 'function'){
					parentheseLevel++;
				}
				if(input[i].categorie == ')'){
					parentheseLevel--;
				}
				if(!parentheseLevel)
				{
					if(input[i].categorie == 'operator' && input[i].type > lowestOperatorLevel)
					{
						lowestOperatorLevel = input[i].type;
						lowestOperatorI = i;
					}
				}
			}
			//Check If there is a sign alone at the end -> error
			if(input[input.length-1].categorie == 'operator')
			{
				this.addError(this.line, 'J\'ai trouvé un opérateur qui n\'avait pas de valeur à sa droite : <strong>' + input[input.length-1].value + '</strong>.');
				return false;
			}
			//if founded one
			if(!parentheseLevel && lowestOperatorI != -1)
			{
				//Calculate
				return this.calculate(
					this.evaluateExpression(input.slice(0,lowestOperatorI)),
					input[lowestOperatorI].value,
					this.evaluateExpression(input.slice(lowestOperatorI+1)));
			}

		};

		this.calculate = function (valueObj1, operator, valueObj2)
		{
			if(valueObj1 === false || valueObj2 === false){
				return false;
			}
			var out = {};
			out.categorie = 'value';
			//Check types
			if($.inArray(operator, ['+','-','*','/']) != -1)
			{
				if($.inArray(valueObj1.type, ['réel','entier']) == -1 || $.inArray(valueObj2.type, ['réel','entier'])  == -1)
				{
					this.addError(this.line, 'L\'opperation suivante a été faite : <br/><strong>'
							+ this.valueobjToString(valueObj1) + ' ' + operator + ' ' + this.valueobjToString(valueObj2) + '</strong> ayant pour types <strong>&lt;'
							+ valueObj1.type + '&gt; ' + operator + ' &lt;' + valueObj2.type + '&gt;</strong><br/>'
							+ 'Or cet opérateur ne supporte que les <strong>réels</strong> ou les <strong>entiers</strong>');
					return false;
				}
				//Output type
				if(valueObj1.type == 'entier' && valueObj2.type == 'entier' && operator != '/'){
					out.type = 'entier';
				}
				else {
					out.type = 'réel';
				}
			}
			else if(operator == '%')
			{
				if(valueObj1.type != 'entier' || valueObj2.type != 'entier')
				{
					this.addError(this.line, 'L\'opperation suivante a été faite : <br/><strong>'
							+ this.valueobjToString(valueObj1) + ' ' + operator + ' ' + this.valueobjToString(valueObj2) + '</strong> ayant pour types <strong>&lt;'
							+ valueObj1.type + '&gt; ' + operator + ' &lt;' + valueObj2.type + '&gt;</strong><br/>'
							+ 'Or cet opérateur ne supporte que les <strong>entiers</strong>');
					return false;
				}
				//Output type
				out.type = 'entier';
			}
			else if($.inArray(operator, ['=','!=','<=','>=','<','>']) != -1)
			{
				//If types are not same AND they are not both (réel or entier)
				if(valueObj1.type != valueObj2.type && ($.inArray(valueObj1.type, ['réel','entier']) == -1 || $.inArray(valueObj2.type, ['réel','entier'])  == -1))
				{
					this.addError(this.line, 'L\'opperation suivante a été faite : <br/><strong>'
							+ this.valueobjToString(valueObj1) + ' ' + operator + ' ' + this.valueobjToString(valueObj2) + '</strong> ayant pour types <strong>&lt;'
							+ valueObj1.type + '&gt; ' + operator + ' &lt;' + valueObj2.type + '&gt;</strong><br/>'
							+ 'Or cet opérateur ne comparer que des éléments du même type (exception faite pour les réels et les entiers qui peuvent être comparés)');
					return false;
				}
				//Output type
				out.type = 'booléen';
			}
			else if($.inArray(operator, ['ET','OU']) != -1)
			{
				if($.inArray(valueObj1.type, ['booléen']) == -1 || $.inArray(valueObj2.type, ['booléen'])  == -1)
				{
					this.addError(this.line, 'L\'opperation suivante a été faite : <br/><strong>'
							+ this.valueobjToString(valueObj1) + ' ' + operator + ' ' + this.valueobjToString(valueObj2) + '</strong> ayant pour types <strong>&lt;'
							+ valueObj1.type + '&gt; ' + operator + ' &lt;' + valueObj2.type + '&gt;</strong><br/>'
							+ 'Or cet opérateur ne supporte que les <strong>booléen</strong>');
					return false;
				}
				//Output type
				out.type = 'booléen';
			}
			else
			{
				this.addError(this.line, 'L\'opperation suivante a été faite : <br/><strong>'
						+ this.valueobjToString(valueObj1) + ' ' + operator + ' ' + this.valueobjToString(valueObj2) + '</strong> ayant pour types <strong>&lt;'
						+ valueObj1.type + '&gt; ' + operator + ' &lt;' + valueObj2.type + '&gt;</strong><br/>'
						+ 'Or cet opérateur n\'existe pas.');
				return false;
			}

			//calculate
			switch(operator)
			{
				case '+':
					out.value = valueObj1.value + valueObj2.value;
					break;
				case '-':
					out.value = valueObj1.value - valueObj2.value;
					break;
				case '*':
					out.value = valueObj1.value * valueObj2.value;
					break;
				case '/':
					if(valueObj2.value === 0) {
						this.addError(this.line, 'On t\'a jamais dit que c\'était interdit de diviser par 0 ?');
						return false;
					}
					out.value = valueObj1.value / valueObj2.value;
					break;
				case '%':
					if(valueObj2.value === 0) {
						this.addError(this.line, 'On t\'a jamais dit que c\'était interdit de diviser par 0 ?');
						return false;
					}
					out.value = valueObj1.value % valueObj2.value;
					break;
				case '=':
					out.value = valueObj1.value == valueObj2.value;
					break;
				case '!=':
					out.value = valueObj1.value != valueObj2.value;
					break;
				case '<=':
					out.value = valueObj1.value <= valueObj2.value;
					break;
				case '>=':
					out.value = valueObj1.value >= valueObj2.value;
					break;
				case '<':
					out.value = valueObj1.value < valueObj2.value;
					break;
				case '>':
					out.value = valueObj1.value > valueObj2.value;
					break;
				case 'ET':
					out.value = valueObj1.value && valueObj2.value;
					break;
				case 'OU':
					out.value = valueObj1.value || valueObj2.value;
					break;
				default:
					this.addError(this.line, 'L\'opperation suivante a été faite : <br/><strong>'
							+ this.valueobjToString(valueObj1) + ' ' + operator + ' ' + this.valueobjToString(valueObj2) + '</strong> ayant pour types <strong>&lt;'
							+ valueObj1.type + '&gt; ' + operator + ' &lt;' + valueObj2.type + '&gt;</strong><br/>'
							+ 'Or cet opérateur n\'existe pas.');
					return false;
			}
			return out;
		};

		this.expressionString = function (expressionObject)
		{
			var output = '';
			for (var i = 0; i < expressionObject.length; i++) {
				output += this.valueobjToString(expressionObject[i]) + ' ';
			}
			return output;
		};

		this.valueobjToString = function (valueObj, quotes)
		{
			quotes = (typeof quotes !== 'undefined' )? quotes : true;
			if(valueObj.categorie == 'value')
			{
				if(valueObj.type == 'caractère')
				{
					if(quotes) {
						return '\'' + valueObj.value + '\'';
					}
					else {
						return valueObj.value;
					}
				}
				if(valueObj.type == 'string')
				{
					if(quotes) {
						return '"' + valueObj.value + '"';
					}
					else {
						return valueObj.value;
					}
				}
				if(valueObj.type == 'booléen') {
					return (valueObj.value)? 'Vrai' : 'Faux';
				}
				else {
					return valueObj.value;
				}
			}
			else if(valueObj.categorie == 'function') {
				return (valueObj.value + '(');
			}
			else {
				return valueObj.value;
			}
		};

		this.executeFunction = function(funcName, input)
		{
			var value;
			switch(funcName)
			{
				case 'e':
					value = this.evaluateExpression(input);
					if(value.type != 'réel')
					{
						this.addError(this.line, 'Vous ne pouvez pas utiliser la fonction <strong>E()</strong> sur une valeur de type <strong>' + value.type + '</strong>. Cette fonction n\'accepte que des <strong>réels</strong>');
						return false;
					}
					value.value = Math.floor(value.value);
					value.type = 'entier';
					return value;
				case 'non':
					value = this.evaluateExpression(input);
					if(value.type != 'booléen')
					{
						this.addError(this.line, 'Vous ne pouvez pas utiliser la fonction <strong>NON()</strong> sur une valeur de type <strong>' + value.type + '</strong>. Cette fonction n\'accepte que des <strong>booléens</strong>');
						return false;
					}
					value.value = !(value.value);
					return value;
				default:
					this.addError(this.line, 'La fonction <strong>' + funcName + '()</strong> n\'existe pas');
					return false;
			}
		};

		//Execute the next instruction
		this.nextLine = function()
		{
			this.disableEditor(true);
			//Get the line value and remove white spaces from start and end of the string
			var instruction = this.editor.getLine(this.line);
			var that = this;
			//if the algorithme reach the end
			if(this.line == -1){
				return;
			}
			if(instruction === undefined)
			{
				$('#sortie').append('<li class="list-group-item list-group-item-success"><u>Ligne ' + (this.line+1) + '</u> : L\'algorithme s\'est terminé correctement</li>');
				this.line = -1;
				this.setActualLine(-1);
				this.disableEditor(false);
				this.loopMode = false;

				$('.btn-start').attr('disabled','disabled');
				$('.btn-pause').attr('disabled','disabled');
				$('.btn-next').attr('disabled','disabled');
				$('.btn-submit').attr('disabled','disabled');

				//Reach the end without find all end of control flow instructions
				if(this.controlFlow.length > 0 && this.controlFlow[this.controlFlow.length-1] !== undefined)
				{
					var endTag;
					if(this.controlFlow[this.controlFlow.length-1].type == 'Si'){
						endTag = 'FinSi';
					}
					else if(this.controlFlow[this.controlFlow.length-1].type == 'Pour'){
						endTag = 'FinPour';
					}
					else{
						endTag = 'l\'element de fin';
					}
					this.addError(this.controlFlow[this.controlFlow.length-1].line, 'je ne trouve pas le <strong>' + endTag + '</strong> correspondant à ce <strong>' + this.controlFlow[this.controlFlow.length-1].type + '</strong>');
				}
				return false;
			}
			//ignore if the line is empty
			instruction = instruction.trim();
			if(instruction !== '' && instruction.substr(0,2) != '//')
			{
				var matches, type, i, found;

				//Wait for "Algorithme <Nom>"
				if(this.mode === 0)
				{
					matches = /^Algorithme\s+([^ "']+)$/i.exec(instruction);
					if(matches !== null){
						this.mode++;
						$('#sortie').append('<li class="list-group-item list-group-item-success"><u>Ligne ' + (this.line+1) + '</u> : Début de l\'algorithme <strong>' + matches[1].replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;') + '</strong></li>');
					}
					else
					{
						this.addError(this.line, 'L\'algorithme ne commence pas par <strong>Algorithme Nom_algorithme</strong>');
						return false;
					}
				}

				//Wait for "Types:" or "Variables:" or "Instructions:"
				else if(instruction.toLowerCase() == 'types:' || instruction.toLowerCase() == 'variables:' || instruction.toLowerCase() == 'instructions:')
				{
					switch(this.mode) //this.mode cannot decrement, but it can jump one or two this.mode
					{
						case 1:
							if(instruction.toLowerCase() == 'types:'){
								this.mode = 2;
								break;
							}
							/* falls through */
						case 2:
							if(instruction.toLowerCase() == 'variables:'){
								this.mode = 3;
								break;
							}
							/* falls through */
						case 3:
							if(instruction.toLowerCase() == 'instructions:'){
								this.mode = 4;
								break;
							}
							/* falls through */
						default:
							this.addError(this.inputWait.line, 'Je m\'attendais à trouver <strong>Types:</strong>, <strong>Variables:</strong> ou <strong>Instructions:</strong> dans cet ordre mais ça n\'a pas été le cas');
							return false;
					}
				}

				//if Types this.mode
				else if(this.mode == 2)
				{
					this.addError(this.line, 'Je ne sais pas encore comment interpréter les types.. donc je vais les ignorer !',true);
				}

				//if Variables this.mode
				else if(this.mode == 3) // var1, var2, var3[, ...] : type
				{
					if(/^([^:]+):\s*([^: ]+)\s*;?$/i.test(instruction))
					{
						var vars = RegExp.$1;
						type = RegExp.$2.trim().toLowerCase();
						switch(type)
						{
							case 'réels': /* falls through */
							case 'réel': /* falls through */
							case 'reels': /* falls through */
							case 'reel':
								type = 'réel';
								break;
							case 'entier': /* falls through */
							case 'entiers':
								type = 'entier';
								break;
							case 'caractères': /* falls through */
							case 'caractère': /* falls through */
							case 'caracteres': /* falls through */
							case 'caractere':
								type = 'caractère';
								break;
							case 'booléens': /* falls through */
							case 'booléen': /* falls through */
							case 'booleens': /* falls through */
							case 'booleen':
								type = 'booléen';
								break;
							default:
								this.addError(this.line, 'La type <strong>' + type + '</strong> n\'existe pas');
								return;
						}

						//Split vars
						vars = vars.split(',');
						for (var j = 0; j < vars.length; j++)
						{
							vars[j] = vars[j].trim();
							//Check if there is alway something between ","
							if(vars[j] === '') {
								this.addError(this.line, 'Apparement, il y a une virgule en trop !', true);
							}
							else
							{
								//Check if var not already defined
								if(this.varsTypes[vars[j]] === undefined)
								{
									this.varsNames.push(vars[j]);
									this.varsTypes[vars[j]] = type.toLowerCase();
								}
								else{
									this.addError(this.line, 'La variable <strong>' + vars[j] + '</strong> a déjà été définie');
									return;
								}

								//add to the trace table
								$('#trace').find('tbody').append('<tr><th>' + vars[j] + '</th></tr>');
							}
						}
					}
					else {
						this.addError(this.line, 'Cette ligne doit être au format <strong>var1 : type</strong>');
					}

				}

				//if Instructions this.mode
				else if(this.mode == 4)
				{
					//init screen & keyboard output
					if(this.traceScreenLine == -1)
					{
						$('#trace').find('tbody').append('<tr><th><em>Écran</em></th></tr>');
						$('#trace').find('tbody').append('<tr><th><em>Clavier</em></th></tr>');
						this.traceScreenLine = $('#trace').find('tbody').length-1;
					}

					//Find instruction
					var screenOutput = '';
					var keyboardInput = '';
					var lineContent;
					var condition;
					var dontTrace = false;
					if((matches = instruction.match(/^([a-z0-9_]+)\s*<-\s*(.+)$/i)) !== null) // <var> <- <expression>
					{
						//Get type
						if(this.varsTypes[matches[1]] === undefined)
						{
							this.addError(this.line, 'La variable <strong>' + matches[1] + '</strong> n\'est pas définie');
							return false;
						}
						type = this.varsTypes[matches[1]];

						//execute expression
						var valueObj = this.executeExpression(matches[2]);
						if(valueObj === false){
							return false;
						}

						//Check type
						if(valueObj.type != type && !(valueObj.type == 'entier' && type == 'réel'))
						{
							this.addError(this.line, 'Vous ne pouvez pas assigner une valeur de type <strong>&lt;' + valueObj.type + '&gt;</strong> à une variable de type <strong>&lt;' + type + '&gt;</strong>.');
							return false;
						}

						//Set var
						this.varsValues[matches[1]] = valueObj.value;

					}
					else if((matches = instruction.match(/^[ée]crire\s*\(\s*(.+)\s*!\s*\)$/i)) !== null) // Ecrire(<expression>,<expression>, ... !)
					{
						var params = matches[1].splitUnquotted(',');
						screenOutput = '';
						for (i = 0; i < params.length; i++) {
							screenOutput += this.valueobjToString(this.executeExpression(params[i]),false);
						}
						$('#sortie').append('<li class="list-group-item">' + screenOutput + '</li>');

						//scroll to the message
						//If the element is below the screen
						if($('html, body').scrollTop() < ($('#sortie').children('li').last().offset().top + $('#sortie').children('li').last().height() - $( window ).height())){
							$('html, body').scrollTop($('#sortie').children('li').last().offset().top + $('#sortie').children('li').last().height() - $( window ).height() );
						}
						//else if the element is above
						else if($('html, body').scrollTop() > $('#sortie').children('li').last().offset().top){
							$('html, body').scrollTop($('#sortie').children('li').last().offset().top);
						}
					
					}
					else if((matches = instruction.match(/^lire\s*\(\s*(.+)\s*!\s*([a-z0-9_]+)\s*\)$/i)) !== null) // Lire(<source> ! <sortie>)
					{
						//source
						matches[1] = matches[1].trim();
						if(matches[1].toLowerCase() != 'clavier')
						{
							this.addError(this.line, 'Je ne sais pas lire depuis <strong>' + matches[1] + '</strong>. Remplacez cette source par <strong>clavier</strong> si vous souhaitez que je récupère les touches du clavier.');
							return false;
						}
						//destination var
						matches[2] = matches[2].trim();
						if(this.varsTypes[matches[2]] === undefined)
						{
							this.addError(this.line, 'La variable <strong>' + matches[2] + '</strong> n\'est pas définie');
							return false;
						}
						if(this.inputValue === '' && !this.inputCreated)
						{
							$('#sortie').append('<li class="list-group-item"><div class="input-group"><input type="text" class="form-control input-l'+this.line+' input-submit"/> '
								+ '<span class="input-group-btn"><button class="btn btn-default btn-submit" type="button">Envoyer !</button></span></div></li>');
							this.inputCreated = true;
							$('#sortie').find('.input-l' + this.line)[0].focus();
							return false;
						}
						if(this.inputValue !== '' && !this.inputCreated) {
							this.inputSubmited = true;
						}
						if(this.inputSubmited)
						{
							if(this.inputCreated) {
								keyboardInput = this.inputValue;
							}
							this.inputSubmited = false;
							this.inputCreated = false;
							//Set var
							switch(this.varsTypes[matches[2]])
							{
								case 'caractère':
									this.varsValues[matches[2]] = this.inputValue[0];
									this.inputValue = this.inputValue.substr(1);
									break;
								case 'réel':
									this.varsValues[matches[2]] = parseFloat(this.inputValue.replace(',','.'));
									if(isNaN(this.varsValues[matches[2]]))
									{
										this.addError(this.line,'La valeur donnée par l\'utilisateur <strong>' + this.inputValue + '</strong> n\'est pas un réel');
										return false;
									}
									this.inputValue = '';
									break;
								case 'entier':
									this.varsValues[matches[2]] = parseInt(this.inputValue,10);
									if(isNaN(this.varsValues[matches[2]]))
									{
										this.addError(this.line,'La valeur donnée par l\'utilisateur <strong>' + this.inputValue + '</strong> n\'est pas un entier');
										return false;
									}
									this.inputValue = '';
									break;
								case 'string':
									this.varsValues[matches[2]] = this.inputValue;
									this.inputValue = '';
									break;
								case 'booléen':
									this.varsValues[matches[2]] = (this.inputValue.toLowerCase() == 'vrai');
									this.inputValue = '';
									break;
							}
						}
						else
						{
							return false;
						}

					}

					// SinonSi <expression=bool> Alors || Sinon
					else if((matches = instruction.match(/^SinonSi\s*(.+)\s*Alors$/i)) !== null || instruction.toLowerCase() == 'sinon')
					{
						if(this.controlFlow[this.controlFlow.length-1] === undefined)
						{
							this.addError(this.line, 'je ne trouve pas le <strong>Si</strong> correspondant à ce <strong>FinSi</strong>.');
							return false;
						}
						else if(this.controlFlow[this.controlFlow.length-1].type != 'Si')
						{
							this.addError(this.line, 'je ne trouve pas le <strong>Si</strong> correspondant à ce <strong>FinSi</strong>. A la place je trouve un <strong>' + this.controlFlow[this.controlFlow.length-1].type + '</strong>');
							return false;
						}
						
						//if we are here, we jump to "FinSi" the "true block" of the whole "Si" is the block just before. So this one is "false".
						found = false;
						for (i = this.line+1; i < this.editor.lineCount(); i++)
						{
							lineContent = this.editor.getLine(i).trim();
							if(lineContent.toLowerCase() == 'finsi')
							{
								this.controlFlow.pop();
								found = true;
								this.line = i;
								dontTrace = true;
								break;
							}
						}
						if(!found)
						{
							this.addError(this.line, 'je ne trouve pas le <strong>FinSi</strong> correspondant à ce <strong>Si .. Alors</strong>');
							return false;
						}

					}

					// Si <expression=bool> Alors
					else if((matches = instruction.match(/^Si\s+(.+)\s+Alors$/i)) !== null)
					{
						matches[1] = matches[1].trim();
						if(matches[1] === '')
						{
							this.addError(this.line, 'La condition du <strong>' + instruction + '</strong> est vide');
							return false;
						}
						condition = this.executeExpression(matches[1]);
						if(condition.type != 'booléen')
						{
							this.addError(this.line, 'La condition du <strong>' + instruction + '</strong> doit être un <strong>booléen</strong> mais c\'est un <strong>' + condition.type + '</strong>');
							return false;
						}

						//save "Si" position
						this.controlFlow[this.controlFlow.length] = {};
						this.controlFlow[this.controlFlow.length-1].type = 'Si';
						this.controlFlow[this.controlFlow.length-1].line = this.line;
						this.controlFlow[this.controlFlow.length-1].value = condition;

						//If condition is false, we look for 'Sinon', 'SinonSi' or 'FinSi'
						if(!condition.value)
						{
							found = false;
							for (i = this.line+1; i < this.editor.lineCount(); i++)
							{
								lineContent = this.editor.getLine(i).trim();
								if((matches = lineContent.match(/^SinonSi\s+(.+)\s+Alors$/i)) !== null)
								{
									matches[1] = matches[1].trim();
									if(matches[1] === '')
									{
										this.addError(this.line, 'La condition du <strong>' + lineContent + '</strong> est vide');
										return false;
									}
									condition = this.executeExpression(matches[1]);
									if(condition.type != 'booléen')
									{
										this.addError(this.line, 'La condition du <strong>' + lineContent + '</strong> doit être un <strong>booléen</strong> mais c\'est un <strong>' + condition.type + '</strong>');
										return false;
									}

									//If the condition of the SinonSi is true, we jump on his algo, else we continue to look for ...
									if(condition.value)
									{
										found = true;
										this.addTraceColumn(this.line);
										this.line = i;
										break;
									}
								}
								else if(lineContent.toLowerCase() == 'sinon')
								{
									found = true;
									this.addTraceColumn(this.line);
									this.line = i;
									break;
								}
								else if(lineContent.toLowerCase() == 'finsi')
								{
									this.controlFlow.pop();
									found = true;
									this.addTraceColumn(this.line);
									this.line = i;
									console.log("bob")
									dontTrace = true;
									break;
								}
							}
							if(!found)
							{
								this.addError(this.line, 'je ne trouve pas le <strong>FinSi</strong> correspondant à ce <strong>Si .. Alors</strong>');
								return false;
							}
						}

					}

					// FinSi
					else if((matches = instruction.match(/^FinSi$/i)) !== null)
					{
						if(this.controlFlow[this.controlFlow.length-1] === undefined)
						{
							this.addError(this.line, 'je ne trouve pas le <strong>Si</strong> correspondant à ce <strong>FinSi</strong>.');
							return false;
						}
						else if(this.controlFlow[this.controlFlow.length-1].type != 'Si')
						{
							this.addError(this.line, 'je ne trouve pas le <strong>Si</strong> correspondant à ce <strong>FinSi</strong>. A la place je trouve un <strong>' + this.controlFlow[this.controlFlow.length-1].type + '</strong>');
							return false;
						}
						this.controlFlow.pop();
						dontTrace = true;
					}

					// Pour<variable (entier)> de <expression (entier)> à<expression (entier)> par pas de <expression (entier)>
					else if((matches = instruction.match(/^Pour\s+([a-z0-9_]+)\s+(?:allant\s+)?de\s+(.+)\s+à\s+(.+)\s+par\s+pas\s+de\s+(.+)$/i)) !== null)
					{
						var forVar = matches[1].trim();
						var forBegin;
						var forEnd;
						var forStep;

						//Check var
						if(this.varsTypes[forVar] === undefined) {
							this.addError(this.line, 'La variable <strong>' + matches[1] + '</strong> n\'est pas définie');
							return false;
						}
						if(this.varsTypes[forVar] != 'entier') {
							this.addError(this.line, 'La variable <strong>' + matches[1] + '</strong> devrait être de type <strong>entier</strong> pour être utilisé dans une boucle <strong>Pour</strong>');
							return false;
						}

						//Begin
						matches[2] = matches[2].trim();
						if(matches[2] === '') {
							this.addError(this.line, 'La valeur initiale de la boucle <strong>Pour</strong> est vide');
							return false;
						}
						forBegin = this.executeExpression(matches[2]);
						if(forBegin.type != 'entier') {
							this.addError(this.line, 'La valeur initiale de la boucle <strong>Pour</strong> doit être un <strong>entier</strong> mais c\'est un <strong>' + forBegin.type + '</strong>');
							return false;
						}

						//End
						matches[3] = matches[3].trim();
						if(matches[3] === '') {
							this.addError(this.line, 'La valeur finale de la boucle <strong>Pour</strong> est vide');
							return false;
						}
						forEnd = this.executeExpression(matches[3]);
						if(forEnd.type != 'entier') {
							this.addError(this.line, 'La valeur finale de la boucle <strong>Pour</strong> doit être un <strong>entier</strong> mais c\'est un <strong>' + forEnd.type + '</strong>');
							return false;
						}

						//Step
						matches[4] = matches[4].trim();
						if(matches[4] === '') {
							this.addError(this.line, 'Le pas de la boucle <strong>Pour</strong> est vide');
							return false;
						}
						forStep = this.executeExpression(matches[4]);
						if(forStep.type != 'entier') {
							this.addError(this.line, 'Le pas de la boucle <strong>Pour</strong> doit être un <strong>entier</strong> mais c\'est un <strong>' + forStep.type + '</strong>');
							return false;
						}
						if(forStep.value === 0) {
							this.addError(this.line, 'Le pas de la boucle <strong>Pour</strong> ne peut valoir <strong>0</strong>');
							return false;
						}

						//init var
						this.varsValues[forVar] = forBegin.value;

						//Test condition, if false jump to "FinPour"
						if((forStep.value > 0 && forBegin.value > forEnd.value) || (forStep.value < 0 && forBegin.value < forEnd.value))
						{
							found = false;
							for (i = this.line+1; i < this.editor.lineCount(); i++)
							{
								lineContent = this.editor.getLine(i).trim();
								if(lineContent.toLowerCase() == 'finpour')
								{
									this.addTraceColumn(this.line);
									found = true;
									this.line = i;
									break;
								}
							}
							if(!found)
							{
								this.addError(this.line, 'je ne trouve pas le <strong>FinSi</strong> correspondant à ce <strong>Si .. Alors</strong>');
								return false;
							}
						}
						else
						{
							//save "Pour" position
							this.controlFlow[this.controlFlow.length] = {};
							this.controlFlow[this.controlFlow.length-1].type = 'Pour';
							this.controlFlow[this.controlFlow.length-1].line = this.line;
							this.controlFlow[this.controlFlow.length-1].variable = forVar;
							this.controlFlow[this.controlFlow.length-1].begin = forBegin;
							this.controlFlow[this.controlFlow.length-1].end = forEnd;
							this.controlFlow[this.controlFlow.length-1].step = forStep;
						}
					}

					// FinPour
					else if((matches = instruction.match(/^FinPour$/i)) !== null)
					{
						if(this.controlFlow[this.controlFlow.length-1] === undefined)
						{
							this.addError(this.line, 'je ne trouve pas le <strong>Pour</strong> correspondant à ce <strong>FinPour</strong>.');
							return false;
						}
						else if(this.controlFlow[this.controlFlow.length-1].type != 'Pour')
						{
							this.addError(this.line, 'je ne trouve pas le <strong>Pour</strong> correspondant à ce <strong>FinPour</strong>. A la place je trouve un <strong>' + this.controlFlow[this.controlFlow.length-1].type + '</strong>');
							return false;
						}

						//increment and test condition
						var forData = this.controlFlow[this.controlFlow.length-1];
						this.varsValues[forData.variable] += forData.step.value;
						var value = this.varsValues[forData.variable];
						
						//Test condition, if false jump to "FinPour"
						if((forData.step.value > 0 && value <= forData.end.value) || (forData.step.value < 0 && value >= forData.end.value))
						{
							this.line = forData.line;
						}
						else
						{
							this.controlFlow.pop();
						}
					}

					// Tant que <expression (booléen)> faire
					else if((matches = instruction.match(/^Tant\s+que\s+(.+)\s+faire$/i)) !== null)
					{

						//check condition
						matches[1] = matches[1].trim();
						if(matches[1] === '') {
							this.addError(this.line, 'La condition de la boucle <strong>Tant que</strong> est vide');
							return false;
						}
						condition = this.executeExpression(matches[1]);
						if(condition.type != 'booléen') {
							this.addError(this.line, 'La condition de la boucle <strong>Tant que</strong> doit être un <strong>booléen</strong> mais c\'est un <strong>' + cond.type + '</strong>');
							return false;
						}

						//Test condition, if false jump to "Fintq"
						if(!condition.value)
						{
							found = false;
							for (i = this.line+1; i < this.editor.lineCount(); i++)
							{
								lineContent = this.editor.getLine(i).trim();
								if(lineContent.toLowerCase() == 'fintq')
								{
									this.addTraceColumn(this.line);
									found = true;
									this.line = i;
									break;
								}
							}
							if(!found)
							{
								this.addError(this.line, 'je ne trouve pas le <strong>Fintq</strong> correspondant à ce <strong>Tant que</strong>');
								return false;
							}
						}
						else
						{
							//save "Pour" position
							this.controlFlow[this.controlFlow.length] = {};
							this.controlFlow[this.controlFlow.length-1].type = 'Tant que';
							this.controlFlow[this.controlFlow.length-1].line = this.line;
							this.controlFlow[this.controlFlow.length-1].conditionStr = matches[1];
						}
					}

					// Fintq
					else if((matches = instruction.match(/^Fintq$/i)) !== null)
					{
						if(this.controlFlow[this.controlFlow.length-1] === undefined)
						{
							this.addError(this.line, 'je ne trouve pas le <strong>Tant que</strong> correspondant à ce <strong>Fintq</strong>.');
							return false;
						}
						else if(this.controlFlow[this.controlFlow.length-1].type != 'Tant que')
						{
							this.addError(this.line, 'je ne trouve pas le <strong>Tant que</strong> correspondant à ce <strong>Fintq</strong>. A la place je trouve un <strong>' + this.controlFlow[this.controlFlow.length-1].type + '</strong>');
							return false;
						}

						//increment and test condition
						var tqData = this.controlFlow[this.controlFlow.length-1];
						condition = this.executeExpression(tqData.conditionStr);
						
						//Test condition, if false jump to "FinPour"
						if(condition.value)
						{
							this.line = tqData.line;
						}
						else
						{
							this.controlFlow.pop();
						}
					}

					else
					{
						this.addError(this.line, 'Je ne comprend pas cette instruction : <strong>' + instruction + '</strong>');
						return false;
					}

					console.log(dontTrace);
					if(!dontTrace)
					{
						var traceEndLine = this.addTraceColumn(this.line);
						//Screen output 
						if(screenOutput.length >= 10) {
							screenOutput = screenOutput.substr(0,10) + '..';
						}
						$('#trace').children('tbody').children('tr').eq(traceEndLine).children('td').last().html(screenOutput);
						screenOutput = '';

						//keyboard input
						if(keyboardInput.length >= 10) {
							keyboardInput = keyboardInput.substr(0,10) + '..';
						}
						$('#trace').children('tbody').children('tr').eq(traceEndLine+1).children('td').last().html(keyboardInput);
						if(keyboardInput !== '') {
							keyboardInput = '';
						}
					}
				}

				//if unset this.mode (this.mode=1)
				else
				{
					this.addError(this.line, 'Je m\'attendais à trouver <strong>Types:</strong>, <strong>Variables:</strong> ou <strong>Instructions:</strong> mais ça n\'a pas été le cas');
				}
			}
			this.line++;
			this.setActualLine(this.line);
			
			//to the next instrction
			if(this.loopMode){
				setTimeout(function(){that.nextLine();}, 0);
			}
		};



		this.next = function()
		{
			this.loopMode = false;
			this.nextLine();
		};

		this.addTraceColumn = function(line)
		{
			var that = this;
			$('#trace').children('thead').children('tr').append('<th>' + (line+1) + '</th>');
			var traceEndLine = 0;
			$.each(this.varsNames, function(index, value){
				if( that.varsLastValues[value] != that.varsValues[value] )
				{
					var valueObj = {};
					valueObj.value = that.varsValues[value];
					valueObj.type = that.varsTypes[value];
					valueObj.categorie = 'value';
					$('#trace').children('tbody').children('tr').eq(traceEndLine).append('<td>' + that.valueobjToString(valueObj) + '</td>');
					that.varsLastValues[value] = that.varsValues[value];
				}
				else {
					$('#trace').children('tbody').children('tr').eq(traceEndLine).append('<td></td>');
				}
				traceEndLine ++;
			});
			$('#trace').children('tbody').children('tr').eq(traceEndLine).append('<td></td>');
			$('#trace').children('tbody').children('tr').eq(traceEndLine+1).append('<td></td>');
			return traceEndLine;
		};

		//execute until the end
		this.start = function()
		{
			//Buttons style
			$('.btn-start').addClass('btn-pause');
			$('.btn-start').html('<span class="glyphicon glyphicon-pause"></span> Pause');
			$('.btn-start').removeClass('btn-start');
			$('.btn-next').attr('disabled','disabled');
			//Start interpreter
			this.loopMode = true;
			this.nextLine();
		};

		this.submit = function()
		{
			if(this.inputCreated && !this.inputSubmited)
			{
				$('#sortie').find('.input-l' + this.line).attr('disabled','disabled');
				$('#sortie').find('.input-l' + this.line).parent().find('button').attr('disabled','disabled');
				this.inputValue = $('#sortie').find('.input-l' + this.line)[0].value;
				this.inputCreated = true;
				this.inputSubmited = true;
				this.nextLine();
			}
		};


		this.pause = function()
		{
			$('.btn-pause').addClass('btn-start');
			$('.btn-pause').html('<span class="glyphicon glyphicon-play"></span> Lancer');
			$('.btn-pause').removeClass('btn-pause');
			$('.btn-next').removeAttr('disabled');
			this.loopMode = false;
		};


		this.reset = function()
		{
			this.editor.toTextArea();
			this.init();
		};

		this.disableEditor = function(disable)
		{
			if(disable)
			{
				$('.CodeMirror').css('background-color', '#515151');
				$('.CodeMirror-gutters').css('background-color', '#5a5a5a');
				this.editor.setOption('readOnly', true);
			}
			else
			{
				$('.CodeMirror').css('background-color', '#2c2827');
				$('.CodeMirror-gutters').css('background-color', '#34302f');
				this.editor.setOption('readOnly', false);
			}
		};

	}
	// end of interpreter object NF04


	//Init interpreter
	var nf04 = new NF04();

	//events
	$('.algo-control').on('click','.btn-start', function(){
		nf04.start();
		return false;
	});
	$('.algo-control').on('click','.btn-pause', function(){
		nf04.pause();
		return false;
	});

	$('.algo-control').on('click','.btn-next', function(){
		nf04.next();
		return false;
	});
	$('.algo-control').on('click','.btn-stop', function(){
		nf04.reset();
		return false;
	});


	$('.control-bar').on('click','.btn-open', function(){
		if($(this).parent().hasClass('disabled'))
		{
			return false;
		}
		return true;
	});


	$('#openModal').on('change','#openFile', function(){
		$('#openModal').find('.btn-submit-open').tooltip('hide');
	});

	$('#openModal').on('click','.btn-submit-open', function(){

		//Check if there is a file
		if($('#openModal').find('#openFile')[0].files.length === 0)
		{
			$('#openModal').find('.btn-submit-open').tooltip('destroy');
			$('#openModal').find('.btn-submit-open').tooltip({
				'html':true,
				'title':'Vous devez sélectionner un fichier',
				'container': '#openModal',
				'trigger': 'manual'
			});
			$('#openModal').find('.btn-submit-open').tooltip('show');
			return false;
		}

		//Check file size
		if($('#openModal').find('#openFile')[0].files[0].size >= 100000)
		{
			$('#openModal').find('.btn-submit-open').tooltip('destroy');
			$('#openModal').find('.btn-submit-open').tooltip({
				'html':true,
				'title':'Votre fichier est trop gros',
				'container': '#openModal',
				'trigger': 'manual'
			});
			$('#openModal').find('.btn-submit-open').tooltip('show');
			return false;
		}

		//Load file
		var reader = new FileReader();
		reader.onload = function(theFile)
		{
			nf04.editor.getDoc().setValue(theFile.target.result);
			nf04.reset();
			$('#openModal').modal('hide');
		};
		reader.readAsText($('#openModal').find('#openFile')[0].files[0], 'UTF-8');
	});

	$('.control-bar').on('click','.btn-save', function(){
		var link = document.createElement('a');
	    link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(nf04.editor.getDoc().getValue()));
	    link.setAttribute('download', "algo.nf04");
	    document.body.appendChild(link)
	    link.click();
	    link.remove();
	});


	$('#sortie').on('click','.btn-submit', function(){
		nf04.submit();
	});

	$('#sortie').on('keypress','.input-submit', function(event){
		if(event.which == 13)
		{
			nf04.submit();
		}
	});

	nf04.editor.on('change', function()
	{
		nf04.tooltipMsgs = [];
		nf04.updateTooltips();
	});


	//Open filename parameter in url
	var params = getSearchParameters();
	if(params !== undefined && params.filename !== undefined && params.filename.indexOf('/') == -1)
	{
		$.ajax({
			url:         './algos/' + params.filename + '.nf04',
			type:        'GET',
			dataType:    'text',
			cache:       false,
			success:     function(data){nf04.editor.getDoc().setValue(data);}
		});
	}
});

//remove Strip whitespace from the beginning and end of a string
String.prototype.trim = function()
{
	return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
};

//Split with ignore when between "" or ''
String.prototype.splitUnquotted = function(separator)
{
	var out = [];
	out[0] = '';
	var stringMode = false;
	for (var i = 0; i < this.length; i++) {
		if(stringMode)
		{
			if(this[i] == stringMode && this[i-1] != '\\')
			{
				stringMode = false;
			}
			out[out.length-1] += this[i];
		}
		else
		{
			if(this[i] == separator) {
				out[out.length] = '';
			}
			else if(this[i] == '\'' || this[i] == '"')
			{
				out[out.length-1] += this[i];
				stringMode = this[i];
			}
			else {
				out[out.length-1] += this[i];
			}
		}
	}
	return out;
};

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};


/* Syntax:
   array.insert(index, value1, value2, ..., valueN) */
Array.prototype.insert = function(index) {
	this.splice.apply(this, [index, 0].concat(
		Array.prototype.slice.call(arguments, 1)));
	return this;
};

// Get all "get parameters"
// 	from http://stackoverflow.com/questions/5448545/how-to-retrieve-get-parameters-from-javascript
// 	author : weltraumpirat
function transformToAssocArray(prmstr) {
    var params = {};
    var prmarr = prmstr.split('&');
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split('=');
        params[tmparr[0]] = tmparr[1];
    }
    return params;
}
function getSearchParameters() {
	var prmstr = window.location.search.substr(1);
	return (prmstr !== null && prmstr !== '' )? transformToAssocArray(prmstr) : {};
}
