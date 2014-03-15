'use strict';
/* global $:false */

var NF04;
$(function () {

	/**
	 * Class that interpret the code
	 * @param {UI} ui - instance of the ui class
	 * @constructor
	 */
	NF04 = function(ui)
	{
		var nf04 = this;

		/**
		 * Tell to the user that there is an execution error and put the interpreter in error mode (this.line = -1)
		 * @param {string} message - The error message (html)
		 * @param {int} [line=false] - The line of the error. If `false` the current line will be used. If `-1`, no line will be writed, only a message in ouptut.
		 */
		this.addError = function(message, line)
		{
			line = (typeof line !== 'undefined' )? line : false;
			if(line === false) {
				line = this.line;
			}

			//Add style
			if(line != -1) {
				ui.addToOutput('<u>Ligne ' + (line+1) + '</u> : ' + message, 'danger');
				ui.addMarker(line, 'danger');
			}
			else {
				ui.addToOutput(message, 'danger');
			}
			ui.focusOnOutput();

			//Disable all buttons and editor
			ui.disableBtn('start');
			ui.disableBtn('pause');
			ui.disableBtn('next');
			ui.disableBtn('submit');
			ui.disableEditor(false);

			//Stop interpreter
			this.line = -1;
		};


		/**
		 * Tell to the user that there is an execution warning
		 * @param {string} message - The error message (html)
		 * @param {int} [line=false] - The line of the error. If `false` the current line will be used. If `-1`, no line will be writed, only a message in ouptut.
		 */
		this.addWarning = function(message, line)
		{
			line = (typeof line !== 'undefined' )? line : false;
			if(line === false) {
				line = this.line;
			}

			//Add style
			if(line != -1) {
				ui.addToOutput('<u>Ligne ' + (line+1) + '</u> : ' + message, 'warning');
				ui.addMarker(line, 'warning');
			}
			else {
				ui.addToOutput(message, 'warning');
			}
			ui.focusOnOutput();
		};


		
		/**
		 * add trace a new column and put values of each var inside
		 * @param {int} [line] - The line that will be writed on the header of the column. If not set, the actual line (this.line) is used
		**/
		this.traceSetNewColumn = function(line)
		{
			line = (line !== undefined)? line : this.line;

			ui.traceAddNewColumn(line);
			var that = this;
			$.each(this.varsNames, function(index, value){
				if( that.varsLastValues[value] != that.varsValues[value] )
				{
					var valueObj = {
						'value' : that.varsValues[value],
						'type' : that.varsTypes[value],
						'categorie' : 'value'
					};
					ui.traceSetVar(index, that.valueobjToString(valueObj));
					that.varsLastValues[value] = that.varsValues[value];
				}
			});
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
						else
						{
							buffer += expressionString[i];
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
					this.addError('Expression source du problème : <strong>' + oldExpressionString + '</strong>. <br/> Transformé en <strong>' + this.expressionString(out) + '</strong>.');
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
				this.addError('Expression source du problème : <strong>' + oldExpressionString + '</strong>. <br/> Transformé en <strong>' + this.expressionString(out) + '</strong>.');
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
				if(matches[1].toLowerCase() != 'e' && matches[1].toLowerCase() != 'non' && matches[1].toLowerCase() != 'abs' && matches[1].toLowerCase() != 'random')
				{
					this.addError('La fonction ou le sous-algorithme <strong>' + matches[1] + '</strong> n\'existe pas.');
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
					this.addWarning('La valeur <strong>' + value + '</strong> du type <strong>caractère</strong> contient plus d\'un caractère. Elle sera donc tronquée.');
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
					this.addError('La variable <strong>' + matches[1] + '</strong> n\'est pas définie');
					return false;
				}
				out.categorie = 'value';
				out.type = this.varsTypes[matches[1]];
				
				//Get value
				if(this.varsValues[matches[1]] === undefined)
				{
					this.addWarning('La variable <strong>' + matches[1] + '</strong> n\'a pas de valeur');
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
				this.addError('Je ne comprend pas la signification de cet enchainement de caractères : <strong>' + value + '</strong>.');
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
					this.addError('J\'essaye de calculer cette expression : <strong>' + this.expressionString(input) + '</strong> mais j\'ai trouvé deux valeurs qui se suivent <strong>' + this.valueobjToString(input[i]) + '</strong> et <strong>' + this.valueobjToString(input[lastTypeI]) + '</strong> alors que toutes les valeurs doivent être séparés par un opérateur.');
					return false;
				}
				if(input[i].categorie == 'operator' && lastType == 'operator')
				{
					this.addError('J\'essaye de calculer cette expression : <strong>' + this.expressionString(input) + '</strong> mais j\'ai trouvé deux opérateurs qui se suivent <strong>' + this.valueobjToString(input[i]) + '</strong> et <strong>' + this.valueobjToString(input[lastTypeI]) + '</strong> alors que tous les opérateur doivent être séparés par une valeur.');
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
				this.addError('J\'ai trouvé un opérateur qui n\'avait pas de valeur à sa droite : <strong>' + input[input.length-1].value + '</strong>.');
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
					this.addError('L\'opperation suivante a été faite : <br/><strong>'
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
					this.addError('L\'opperation suivante a été faite : <br/><strong>'
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
					this.addError('L\'opperation suivante a été faite : <br/><strong>'
							+ this.valueobjToString(valueObj1) + ' ' + operator + ' ' + this.valueobjToString(valueObj2) + '</strong> ayant pour types <strong>&lt;'
							+ valueObj1.type + '&gt; ' + operator + ' &lt;' + valueObj2.type + '&gt;</strong><br/>'
							+ 'Or cet opérateur ne comparer que des éléments du même type (exception faite pour les réels et les entiers qui peuvent être comparés)');
					return false;
				}
				//Output type
				out.type = 'booléen';
			}
			else if($.inArray(operator.toLowerCase(), ['et','ou']) != -1)
			{
				if($.inArray(valueObj1.type, ['booléen']) == -1 || $.inArray(valueObj2.type, ['booléen'])  == -1)
				{
					this.addError('L\'opperation suivante a été faite : <br/><strong>'
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
				this.addError('L\'opperation suivante a été faite : <br/><strong>'
						+ this.valueobjToString(valueObj1) + ' ' + operator + ' ' + this.valueobjToString(valueObj2) + '</strong> ayant pour types <strong>&lt;'
						+ valueObj1.type + '&gt; ' + operator + ' &lt;' + valueObj2.type + '&gt;</strong><br/>'
						+ 'Or cet opérateur n\'existe pas.');
				return false;
			}

			//calculate
			switch(operator.toLowerCase())
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
						this.addError('On t\'a jamais dit que c\'était interdit de diviser par 0 ?');
						return false;
					}
					out.value = valueObj1.value / valueObj2.value;
					break;
				case '%':
					if(valueObj2.value === 0) {
						this.addError('On t\'a jamais dit que c\'était interdit de diviser par 0 ? (..Je sais, c\'est pas une division, sauf que c\'est le reste de la division, donc si on peut pas diviser, y\'a pas de reste)');
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
				case 'et':
					out.value = valueObj1.value && valueObj2.value;
					break;
				case 'ou':
					out.value = valueObj1.value || valueObj2.value;
					break;
				default:
					this.addError('L\'opperation suivante a été faite : <br/><strong>'
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
						this.addError('Vous ne pouvez pas utiliser la fonction <strong>E()</strong> sur une valeur de type <strong>' + value.type + '</strong>. Cette fonction n\'accepte que des <strong>réels</strong>');
						return false;
					}
					value.value = Math.floor(value.value);
					value.type = 'entier';
					return value;
				case 'non':
					value = this.evaluateExpression(input);
					if(value.type != 'booléen')
					{
						this.addError('Vous ne pouvez pas utiliser la fonction <strong>NON()</strong> sur une valeur de type <strong>' + value.type + '</strong>. Cette fonction n\'accepte que des <strong>booléens</strong>');
						return false;
					}
					value.value = !(value.value);
					return value;
				case 'abs':
					value = this.evaluateExpression(input);
					if(value.type != 'entier')
					{
						this.addError(this.line, 'Vous ne pouvez pas utiliser la fonction <strong>entier()</strong> sur une valeur de type <strong>' + value.type + '</strong>. Cette fonction n\'accepte que des <strong>entiers</strong>');
						return false;
					}
					value.value = Math.abs(value.value);
					return value;
				case 'random': //Undocumented function TODO improve function system
					value = {
						'value' : Math.random(),
						'type' : 'réel',
						'categorie' : 'value'
					};
					return value;
				default:
					this.addError('La fonction <strong>' + funcName + '()</strong> n\'existe pas');
					return false;
			}
		};

		//Execute the next instruction
		this.nextLine = function()
		{
			ui.disableEditor();
			//Get the line value and remove white spaces from start and end of the string
			var instruction = ui.getLine(this.line);
			var that = this;
			//if the algorithme reach the end
			if(this.line == -1){
				return;
			}
			if(instruction === undefined)
			{
				ui.addToOutput('<u>Ligne ' + (this.line+1) + '</u> : L\'algorithme s\'est terminé correctement en <strong>' + this.instructionsCount + '</strong> instructions.', 'success');
				ui.focusOnOutput();
				this.line = -1;

				ui.removeMarker('current');
				ui.disableEditor(false);

				ui.disableBtn('start');
				ui.disableBtn('pause');
				ui.disableBtn('next');
				ui.disableBtn('submit');

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
					matches = /^Algorithme\s+([^\s"']+)$/i.exec(instruction);
					if(matches !== null){
						this.mode++;
						document.title = matches[1];
						ui.addToOutput('<u>Ligne ' + (this.line+1) + '</u> : Début de l\'algorithme <strong>' + matches[1].replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;') + '</strong>', 'success');
						ui.focusOnOutput();
					}
					else
					{
						this.addError('L\'algorithme ne commence pas par <strong>Algorithme Nom_algorithme</strong>');
						return false;
					}
				}

				//Wait for "Types:" or "Variables:" or "Instructions:"
				else if(instruction.match(/^(types|variables|instructions)\s*:$/i))
				{
					switch(this.mode) //this.mode cannot decrement, but it can jump one or two this.mode
					{
						case 1:
							if(instruction.match(/^types\s*:$/i)) {
								this.mode = 2;
								break;
							}
							/* falls through */
						case 2:
							if(instruction.match(/^variables\s*:$/i)) {
								this.mode = 3;
								break;
							}
							/* falls through */
						case 3:
							if(instruction.match(/^instructions\s*:$/i)){
								this.mode = 4;
								break;
							}
							/* falls through */
						default:
							this.addError('Je m\'attendais à trouver <strong>Types:</strong>, <strong>Variables:</strong> ou <strong>Instructions:</strong> dans cet ordre mais ça n\'a pas été le cas',this.inputWait.line);
							return false;
					}
				}

				//if Types this.mode
				else if(this.mode == 2)
				{
					this.addWarning('Je ne sais pas encore comment interpréter les types.. donc je vais les ignorer !');
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
								this.addError('La type <strong>' + type + '</strong> n\'existe pas');
								return;
						}

						//Split vars
						vars = vars.split(',');
						for (var j = 0; j < vars.length; j++)
						{
							vars[j] = vars[j].trim();
							//Check if there is alway something between ","
							if(vars[j] === '') {
								this.addError('Apparement, il y a une virgule en trop !', true);
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
									this.addError('La variable <strong>' + vars[j] + '</strong> a déjà été définie');
									return;
								}

								//add to the trace table
								ui.traceAddNewVar(vars[j]);
							}
						}
					}
					else {
						this.addError('Cette ligne doit être au format <strong>var1 : type</strong>');
					}

				}

				//if Instructions this.mode
				else if(this.mode == 4)
				{
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
							this.addError('La variable <strong>' + matches[1] + '</strong> n\'est pas définie');
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
							this.addError('Vous ne pouvez pas assigner une valeur de type <strong>&lt;' + valueObj.type + '&gt;</strong> à une variable de type <strong>&lt;' + type + '&gt;</strong>.');
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
						ui.addToOutput(screenOutput);
						ui.focusOnOutput();
					}
					else if((matches = instruction.match(/^lire\s*\(\s*(.+)\s*!\s*([a-z0-9_]+)\s*\)$/i)) !== null) // Lire(<source> ! <sortie>)
					{
						//source
						matches[1] = matches[1].trim();
						if(matches[1].toLowerCase() != 'clavier')
						{
							this.addError('Je ne sais pas lire depuis <strong>' + matches[1] + '</strong>. Remplacez cette source par <strong>clavier</strong> si vous souhaitez que je récupère les touches du clavier.');
							return false;
						}
						//destination var
						matches[2] = matches[2].trim();
						if(this.varsTypes[matches[2]] === undefined)
						{
							this.addError('La variable <strong>' + matches[2] + '</strong> n\'est pas définie');
							return false;
						}
						if(this.inputValue === '' && !this.inputCreated)
						{
							ui.addFieldToOutput();
							ui.focusOnOutput();

							this.inputCreated = true;
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
										this.addError('La valeur donnée par l\'utilisateur <strong>' + this.inputValue + '</strong> n\'est pas un réel');
										return false;
									}
									this.inputValue = '';
									break;
								case 'entier':
									this.varsValues[matches[2]] = parseInt(this.inputValue,10);
									if(isNaN(this.varsValues[matches[2]]))
									{
										this.addError('La valeur donnée par l\'utilisateur <strong>' + this.inputValue + '</strong> n\'est pas un entier');
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
							this.addError('je ne trouve pas le <strong>Si</strong> correspondant à ce <strong>FinSi</strong>.');
							return false;
						}
						else if(this.controlFlow[this.controlFlow.length-1].type != 'Si')
						{
							this.addError('je ne trouve pas le <strong>Si</strong> correspondant à ce <strong>FinSi</strong>. A la place je trouve un <strong>' + this.controlFlow[this.controlFlow.length-1].type + '</strong>');
							return false;
						}
						
						//if we are here, we jump to "FinSi" the "true block" of the whole "Si" is the block just before. So this one is "false".
						found = false;
						var SiLine = this.controlFlow[this.controlFlow.length-1].line;
						for (i = this.line+1; i < ui.getLineCount(); i++)
						{
							lineContent = ui.getLine(i).trim();

							if((matches = lineContent.match(/^Si\s+(.+)\s+Alors$/i)) !== null)
							{
								this.controlFlow.push({
									'type' : 'Si',
									'line' : i
								});
							}
							else if(lineContent.toLowerCase() == 'finsi')
							{
								if(this.controlFlow[this.controlFlow.length-1].line == SiLine)
								{
									this.controlFlow.pop();
									found = true;
									this.line = i;
									dontTrace = true;
									break;
								}
								else
								{
									this.controlFlow.pop();
								}
							}
						}
						if(!found)
						{
							this.addError('je ne trouve pas le <strong>FinSi</strong> correspondant à ce <strong>SinonSi ... Alors</strong>');
							return false;
						}

					}

					// Si <expression=bool> Alors
					else if((matches = instruction.match(/^Si\s+(.+)\s+Alors$/i)) !== null)
					{
						matches[1] = matches[1].trim();
						if(matches[1] === '')
						{
							this.addError('La condition du <strong>' + instruction + '</strong> est vide');
							return false;
						}
						condition = this.executeExpression(matches[1]);
						if(condition.type != 'booléen')
						{
							this.addError('La condition du <strong>' + instruction + '</strong> doit être un <strong>booléen</strong> mais c\'est un <strong>' + condition.type + '</strong>');
							return false;
						}

						//save "Si" position
						this.controlFlow.push({
							'type' : 'Si',
							'line' : this.line,
							'value' : condition
						});


						//If condition is false, we look for 'Sinon', 'SinonSi' or 'FinSi'
						if(!condition.value)
						{
							found = false;
							for (i = this.line+1; i < ui.getLineCount(); i++)
							{
								lineContent = ui.getLine(i).trim();

								//Searching for sub "Si" or "FinSi"
								if((matches = lineContent.match(/^Si\s+(.+)\s+Alors$/i)) !== null)
								{
									this.controlFlow.push({
										'type' : 'Si',
										'line' : i
									});
								}
								else if(lineContent.toLowerCase() == 'finsi')
								{
									if(this.controlFlow[this.controlFlow.length-1].line == this.line)
									{
										this.controlFlow.pop();
										found = true;
										this.traceSetNewColumn();
										this.line = i;
										dontTrace = true;
										break;
									}
									else
									{
										this.controlFlow.pop();
									}
								}

								//When we are in the actual "Si" level
								else if(this.controlFlow[this.controlFlow.length-1].line == this.line)
								{

								
									if((matches = lineContent.match(/^SinonSi\s+(.+)\s+Alors$/i)) !== null)
									{
										matches[1] = matches[1].trim();
										if(matches[1] === '')
										{
											this.addError(this.line, 'La condition du <strong>' + lineContent + '</strong> est vide');
											return false;
										}
										var temp = this.line;
										this.line = i;
										condition = this.executeExpression(matches[1]);
										this.line = temp;
										if(condition.type != 'booléen')
										{
											this.addError(i, 'La condition du <strong>' + lineContent + '</strong> doit être un <strong>booléen</strong> mais c\'est un <strong>' + condition.type + '</strong>');
											return false;
										}

										//If the condition of the SinonSi is true, we jump on his algo, else we continue to look for ...
										if(condition.value)
										{
											found = true;
											this.traceSetNewColumn();
											this.line = i;
											break;
										}
									}
									else if(lineContent.toLowerCase() == 'sinon')
									{
										found = true;
										this.traceSetNewColumn();
										this.line = i;
										break;
									}
								}
							}
							if(!found)
							{
								this.addError('je ne trouve pas le <strong>FinSi</strong> correspondant à ce <strong>Si .. Alors</strong>');
								return false;
							}
						}

					}

					// FinSi
					else if((matches = instruction.match(/^FinSi$/i)) !== null)
					{
						if(this.controlFlow[this.controlFlow.length-1] === undefined)
						{
							this.addError('je ne trouve pas le <strong>Si</strong> correspondant à ce <strong>FinSi</strong>.');
							return false;
						}
						else if(this.controlFlow[this.controlFlow.length-1].type != 'Si')
						{
							this.addError('je ne trouve pas le <strong>Si</strong> correspondant à ce <strong>FinSi</strong>. A la place je trouve un <strong>' + this.controlFlow[this.controlFlow.length-1].type + '</strong>');
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
							this.addError('La variable <strong>' + matches[1] + '</strong> n\'est pas définie');
							return false;
						}
						if(this.varsTypes[forVar] != 'entier') {
							this.addError('La variable <strong>' + matches[1] + '</strong> devrait être de type <strong>entier</strong> pour être utilisé dans une boucle <strong>Pour</strong>');
							return false;
						}

						//Begin
						matches[2] = matches[2].trim();
						if(matches[2] === '') {
							this.addError('La valeur initiale de la boucle <strong>Pour</strong> est vide');
							return false;
						}
						forBegin = this.executeExpression(matches[2]);
						if(forBegin.type != 'entier') {
							this.addError('La valeur initiale de la boucle <strong>Pour</strong> doit être un <strong>entier</strong> mais c\'est un <strong>' + forBegin.type + '</strong>');
							return false;
						}

						//End
						matches[3] = matches[3].trim();
						if(matches[3] === '') {
							this.addError('La valeur finale de la boucle <strong>Pour</strong> est vide');
							return false;
						}
						forEnd = this.executeExpression(matches[3]);
						if(forEnd.type != 'entier') {
							this.addError('La valeur finale de la boucle <strong>Pour</strong> doit être un <strong>entier</strong> mais c\'est un <strong>' + forEnd.type + '</strong>');
							return false;
						}

						//Step
						matches[4] = matches[4].trim();
						if(matches[4] === '') {
							this.addError('Le pas de la boucle <strong>Pour</strong> est vide');
							return false;
						}
						forStep = this.executeExpression(matches[4]);
						if(forStep.type != 'entier') {
							this.addError('Le pas de la boucle <strong>Pour</strong> doit être un <strong>entier</strong> mais c\'est un <strong>' + forStep.type + '</strong>');
							return false;
						}
						if(forStep.value === 0) {
							this.addError('Le pas de la boucle <strong>Pour</strong> ne peut valoir <strong>0</strong>');
							return false;
						}

						//init var
						this.varsValues[forVar] = forBegin.value;

						//Test condition, if false jump to "FinPour"
						if((forStep.value > 0 && forBegin.value > forEnd.value) || (forStep.value < 0 && forBegin.value < forEnd.value))
						{
							found = false;
							for (i = this.line+1; i < ui.getLineCount(); i++)
							{
								lineContent = ui.getLine(i).trim();
								if(lineContent.toLowerCase() == 'finpour')
								{
									this.traceSetNewColumn();
									found = true;
									this.line = i;
									break;
								}
							}
							if(!found)
							{
								this.addError('je ne trouve pas le <strong>FinSi</strong> correspondant à ce <strong>Si .. Alors</strong>');
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
							this.addError('je ne trouve pas le <strong>Pour</strong> correspondant à ce <strong>FinPour</strong>.');
							return false;
						}
						else if(this.controlFlow[this.controlFlow.length-1].type != 'Pour')
						{
							this.addError('je ne trouve pas le <strong>Pour</strong> correspondant à ce <strong>FinPour</strong>. A la place je trouve un <strong>' + this.controlFlow[this.controlFlow.length-1].type + '</strong>');
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
							this.addError('La condition de la boucle <strong>Tant que</strong> est vide');
							return false;
						}
						condition = this.executeExpression(matches[1]);
						if(condition.type != 'booléen') {
							this.addError('La condition de la boucle <strong>Tant que</strong> doit être un <strong>booléen</strong> mais c\'est un <strong>' + condition.type + '</strong>');
							return false;
						}

						//Test condition, if false jump to "Fintq"
						if(!condition.value)
						{
							found = false;
							for (i = this.line+1; i < ui.getLineCount(); i++)
							{
								lineContent = ui.getLine(i).trim();
								if(lineContent.toLowerCase() == 'fintq')
								{
									this.traceSetNewColumn();
									found = true;
									this.line = i;
									break;
								}
							}
							if(!found)
							{
								this.addError('je ne trouve pas le <strong>Fintq</strong> correspondant à ce <strong>Tant que</strong>');
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
							this.addError('je ne trouve pas le <strong>Tant que</strong> correspondant à ce <strong>Fintq</strong>.');
							return false;
						}
						else if(this.controlFlow[this.controlFlow.length-1].type != 'Tant que')
						{
							this.addError('je ne trouve pas le <strong>Tant que</strong> correspondant à ce <strong>Fintq</strong>. A la place je trouve un <strong>' + this.controlFlow[this.controlFlow.length-1].type + '</strong>');
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
						this.addError('Je ne comprend pas cette instruction : <strong>' + instruction + '</strong>');
						return false;
					}


					if(!dontTrace)
					{
						this.traceSetNewColumn();
						//Screen output 
						if(screenOutput.length >= 10) {
							screenOutput = screenOutput.substr(0,10) + '..';
						}
						ui.traceSetVar(-2, screenOutput);
						screenOutput = '';

						//keyboard input
						if(keyboardInput.length >= 10) {
							keyboardInput = keyboardInput.substr(0,10) + '..';
						}
						ui.traceSetVar(-1, keyboardInput);
						keyboardInput = '';
					}
					this.instructionsCount ++;
				}

				//if unset this.mode (this.mode=1)
				else
				{
					this.addError('Je m\'attendais à trouver <strong>Types:</strong>, <strong>Variables:</strong> ou <strong>Instructions:</strong> mais ça n\'a pas été le cas');
				}
			}
			this.line++;


			//Set the actual line
			ui.removeMarker('current');
			ui.addMarker(this.line,'current');
			ui.scrollEditorCurrent();
			
			//to the next instrction
			if(this.loopMode){
				setTimeout(function(){that.nextLine();}, 0);
			}

			return true;
		};






















		/**
		 * Reset interpreter
		 */
		this.reinit = function()
		{
			ui.reinit();

			//init vars
			this.loopMode = false; // true: the user want execute each instruction until the end | false: One instruction and then stop


			this.mode = 0;
			this.varsTypes = [];
			this.varsNames = [];
			this.varsValues = [];
			this.varsLastValues = [];
			this.line = 0;
			this.instructionsCount = 0;
			this.traceScreenLine = -1;
			this.inputSubmited = false;
			this.inputCreated = false;
			this.inputValue = '';
			this.controlFlow = [];
		};

	// ========== Buttons functions used in callbacks ============
	// Please don't use this inside, but nf04

		/**
		 * Function called when the user want to execute one instruction
		 */
		this.next = function()
		{
			nf04.loopMode = false;
			nf04.nextLine();
		};


		/**
		 * Function called when the user want to execute until the end
		 */
		this.start = function()
		{
			//Buttons style
			ui.showPauseBtn();
			ui.disableBtn('next');

			//Start interpreter
			if(ui.speedmode)
			{
				nf04.loopMode = false;
				while(true)
				{
					if(!nf04.nextLine())
					{
						break;
					}
				}
			}
			else
			{
				nf04.loopMode = true;
				nf04.nextLine();
			}
		};


		/**
		 * Function called when the user want to pause the execution after this.start()
		 */
		this.pause = function()
		{
			ui.showPauseBtn(false);
			ui.disableBtn('next', false);

			nf04.loopMode = false;
		};


		/**
		 * Function called when the user want to reset everything in the interpreter
		 */
		this.reset = function()
		{
			nf04.reinit();

			//this.init();
		};

		/**
		 * Function called when the user change the speedmode
		 * @param {bool} enabled - True if the user did just enable the speedmode or false if he disabled it
		 */
		this.speedmode = function(enabled)
		{
			nf04.reset();
		};

		/**
		 * Function called after an user prompt when he valide his answere
		 */
		this.submit = function()
		{
			if(nf04.inputCreated && !nf04.inputSubmited)
			{
				ui.disableOutputFields();
				ui.disableBtn('submit');
				nf04.inputValue = ui.readOutputField();
				nf04.inputCreated = true;
				nf04.inputSubmited = true;

				if(nf04.loopMode) {
					nf04.start();
				}
				else {
					nf04.next();
				}
			}
		};

	// ========== Init ============
		//Set ui callbacks
		ui.onButtonClick('start', this.start);
		ui.onButtonClick('pause', this.pause);
		ui.onButtonClick('next', this.next);
		ui.onButtonClick('reset', this.reset);
		ui.onButtonClick('submit', this.submit);
		ui.onButtonClick('speedmode', this.speedmode);

		this.reinit();


	};
});
