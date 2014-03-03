
$(function() {
	//Init codemirror
		var nf04 = new NF04();
	//events
		$('.algo-control').on('click','.btn-start', function(){
			nf04.start();
		});
		$('.algo-control').on('click','.btn-pause', function(){
			nf04.pause();
		});

		$('.algo-control').on('click','.btn-next', function(){
			nf04.next();
		});

		$('.algo-control').on('click','.btn-stop', function(){
			nf04.reset();
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


		nf04.editor.on("change", function(){
			$('.ui-tooltip').hide();
	  	});
	//Execute algo

	function NF04() 
	{ 
		this.init = function()
		{
			//(re)init buttons
			$('.btn-pause').addClass('btn-start')
			$('.btn-pause').html('<span class="glyphicon glyphicon-play"></span> Lancer')
			$('.btn-pause').removeClass('btn-pause')
			$('.btn-stop').attr('disabled','disabled')
			$('.btn-next').removeAttr('disabled')
			$('.btn-start').removeAttr('disabled')
			//init vars
			this.mode = 0;
			this.varsTypes = Array();
			this.varsNames = Array();
			this.varsValues = Array();
			this.varsLastValues = Array();
			this.line = 0; 
			this.traceCount = 0; 
			this.traceScreenLine = -1;
			this.tooltipMsgs = []
			this.inputSubmited = false;
			this.inputCreated = false;
			this.inputValue = '';
			this.loopMode = false;
			//set trace and output
			$('#sortie').html('');
			$('#trace').html('<thead><tr><th>&nbsp;</th></tr></thead><tbody></tbody>');
			//Setup editor
			this.editor = CodeMirror.fromTextArea(document.getElementById('code'),
			{
			    lineNumbers: true,
			    styleActiveLine: true,
			    matchBrackets: true,
			    theme: "pastel-on-dark",
  				gutters: ["CodeMirror-linenumbers", "errorMark", "actualLineMark"],
			})

		}
		// and init !
		this.init();




		//Update all tooltips
		this.updateTooltips = function () 
		{
			var editor= this.editor;
			$.each(this.tooltipMsgs,function(index, value){
				editor.addLineClass(index, "wrap", "tooltip-msg tooltip-msg-" + index) 
				$( ".tooltip-msg" ).tooltip({
					position: {
						my: "left bottom-10",
						at: "left top",
						using: function( position, feedback ) {
							$( this ).css( position );
							$( "<div>" )
							.addClass( "arrow" )
							.addClass( feedback.vertical )
							.addClass( feedback.horizontal )
							.appendTo( this );
						}
					},
				 	hide: {
						effect: "hide",
						delay: 0
					},
					show: {
						effect: "show",
						delay: 0
					},
				});
				$( ".tooltip-msg-" + index ).attr("title","")
				$( ".tooltip-msg-" + index ).tooltip( "option", "content", value);
			});
		}
		//add error mark on editor
		this.addError = function (line, message, isWarning = false) 
		{

			//add colored disc next to the line number
				var marker = document.createElement("div");
				marker.innerHTML = "●";
				if(isWarning){
					marker.style.color = "orange";
					this.editor.addLineClass(line, "background", "warningBg")
					$('#sortie').append('<li class="list-group-item list-group-item-warning"><u>Ligne ' + (line+1) + '</u> : ' + message + '</li>');

				}
				else{
					marker.style.color = "red";
					this.editor.addLineClass(line, "background", "errorBg")
					$('#sortie').append('<li class="list-group-item list-group-item-danger"><u>Ligne ' + (line+1) + '</u> : ' + message + '</li>');
					//stop ui except reset button
					this.editor.removeLineClass(line, "background", "actualLine") ;
					this.line = -1;
					$('.btn-start').attr('disabled','disabled')
					$('.btn-pause').attr('disabled','disabled')
					$('.btn-next').attr('disabled','disabled')
					$('.btn-submit').attr('disabled','disabled')
					$('.btn-stop').removeAttr('disabled')
					this.disableEditor(false)
				}
				this.editor.setGutterMarker(line, "errorMark", marker);
			//Set tooltip
				this.tooltipMsgs[line] = message;
				this.updateTooltips();
		}

		this.setActualLine = function (line) 
		{
			//Remove old actual line
				for (var j = 0; j < this.editor.lineCount() ; j++) 
				{
					this.editor.removeLineClass(j, "background", "actualLine") ;
				}
					this.editor.clearGutter("actualLineMark")
			//set Actual line style
				if(line != -1)
				{
					this.editor.addLineClass(line, "background", "actualLine") ;

					var marker = document.createElement("div");
					marker.innerHTML = ">";
					marker.style.color = "#6faedf";
					this.editor.setGutterMarker(line, "actualLineMark", marker);
					//scroll
					var elementHeight = Math.round($('.CodeMirror-vscrollbar').children('div').height() / this.editor.lineCount());
					//If the element is below the view
					if($('.CodeMirror-vscrollbar').scrollTop() < (elementHeight*(line+1) - $('.CodeMirror').height() + 5))
						$('.CodeMirror-vscrollbar').scrollTop(elementHeight*(line+1) - $('.CodeMirror').height() + 5)
					//else if the element is above
					else if($('.CodeMirror-vscrollbar').scrollTop() > elementHeight*line )
						$('.CodeMirror-vscrollbar').scrollTop(elementHeight*line)
				}
			this.updateTooltips();
		}


		this.executeExpression = function (expressionString, quotes = true) 
		{
			//To array
			var oldExpressionString = expressionString;
			var out = Array();
			var buffer = '';
			var parenthesesLevel = 0;
			var stringMode = false;
			for (var i = 0; i < expressionString.length; i++) 
			{
				//whitespaces
				if(!stringMode && /^\s$/.test(expressionString[i]))
				{
					if(buffer != '')
					{
						out[out.length] = new Object();
						out[out.length-1].value = buffer;
						buffer = '';
					}	
				}
				else if(!stringMode && "+-*/%=!<>".indexOf(expressionString[i]) != -1) // Operators chars that will break any var name or function or anything except stringmode
				{
					//Save buffer
						if(buffer != '')
						{
							out[out.length] = new Object();
							out[out.length-1].value = buffer;
							buffer = '';
						}
					//check the char after this one to know if it"s a two-char operator
						if(expressionString[i+1] != undefined && $.inArray((expressionString[i]+expressionString[i+1]), Array('!=','<=','>=')) != -1)
						{
							out[out.length] = new Object();
							out[out.length-1].value = (expressionString[i] + expressionString[i+1]);
							i++;
						}
						else
						{
							out[out.length] = new Object();
							out[out.length-1].value = expressionString[i];
						}
				}
				else if(!stringMode && expressionString[i] == '(')
				{
					if(buffer != '')
					{
						if(buffer.toLowerCase == 'ou' || buffer.toLowerCase == 'et')
						{
							out[out.length] = new Object();
							out[out.length-1].value = buffer;
							out[out.length] = new Object();
							out[out.length-1].value = '(';
						}
						else
						{
							out[out.length] = new Object();
							out[out.length-1].value = buffer + '(';
						}
						buffer = '';
					}	
					else
					{
						out[out.length] = new Object();
						out[out.length-1].value = '(';
					}
					parenthesesLevel++;
				}
				else if(!stringMode && expressionString[i] == ')')
				{
					if(buffer != '')
					{
						out[out.length] = new Object();
						out[out.length-1].value = buffer;
						buffer = '';
					}	
					parenthesesLevel--;
					out[out.length] = new Object();
					out[out.length-1].value = ')'
					//TODO exit and error if < 0
				}
				else if(expressionString[i] == '\'' || expressionString[i] == '"')
				{
					if(!stringMode)
					{
						//save buffer
						if(buffer != '')
						{
							out[out.length] = new Object();
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
							out[out.length] = new Object();
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


			};
			//Save final buffer
			if(buffer != '')
			{
				out[out.length] = new Object();
				out[out.length-1].value = buffer;
				buffer = '';
			}	

			//look at value and check if all cell are known types and replace vars
				for (i = 0; i < out.length; i++) 
				{
					var temp;
					if(temp = this.getType(out[i].value, quotes))
					{
						out[i] = temp;
					}
					else
					{
						this.addError(this.line, "Expression source du problème : <strong>" + oldExpressionString + "</strong>. <br/> Transformé en <strong>" + this.expressionString(out) + "</strong>.");
						return false;
					}
				}
			//If there is there is - or + without value at left, just add zero
				for (i = 0; i < out.length; i++) 
				{
					if((out[i].value == '-' || out[i].value == '+') && (out[i-1] == undefined || out[i-1].categorie != 'value'))
					{
						out.insert(i,Object)
						out[i].value = 0;
						out[i].type = 'réel';
						out[i].categorie = 'value';
					}
				}

			//Calculate
			var result = this.evaluateExpression(out);
			if(!result)
			{
				this.addError(this.line, "Expression source du problème : <strong>" + oldExpressionString + "</strong>. <br/> Transformé en <strong>" + this.expressionString(out) + "</strong>.");
			}
			return result;
		}

		this.getType = function(value) 
		{
			var out = new Object();
			out.value = value;
			if(value == '(' || value == ')')
			{
				out.categorie = value;
				out.type = value;
			}
			else if(matches = value.match(/^([a-z0-9_]+)\($/i)) //Function
			{
				out.categorie = 'function';
				out.type = 'function';
				out.value = matches[1].toLowerCase();
				if(matches[1].toLowerCase() != 'e' && matches[1].toLowerCase() != 'non')
				{
					this.addError(this.line, "La fonction ou le sous-algorithme <strong>" + matches[1] + "</strong> n'existe pas.");
					return false;
				}
			}
			else if(value.match(/^([0-9]+)$/i) != null) //Entier
			{
				out.value = parseInt(value);
				out.categorie = 'value';
				out.type = 'entier';
			}
			else if(value.match(/^([0-9,\.]+)$/i) != null) //Réel
			{
				out.value = parseFloat(value.replace(',','.'));
				out.categorie = 'value';
				out.type = 'réel';
			}
			else if(value.match(/^(\*|\/|%)$/i) != null) //Operator level first
			{
				out.categorie = 'operator';
				out.type = 1;
			}
			else if(value.match(/^(\+|-)$/i) != null) //Operator level second
			{
				out.categorie = 'operator';
				out.type = 2;
			}
			else if(value.match(/^(=|!=|<=|>=|<|>)$/i) != null) //Operator third second
			{
				out.categorie = 'operator';
				out.type = 3;
			}
			else if(value.match(/^(ET|OU)$/i) != null) //Operator level fourth
			{
				out.categorie = 'operator';
				out.type = 4;
			}
			else if((matches = value.match(/^"([^"]*)"$/i)) != null) //String : temp type, i will remove it after array implementation TODO
			{
				out.categorie = 'value';
				out.type = 'string';
				out.value = matches[1];
			}
			else if((matches = value.match(/^'(\\?[^']*)'$/i)) != null) //Caractère
			{
				if(matches[1].length >= 2)
					this.addError(this.line, "La valeur <strong>" + value + "</strong> du type <strong>caractère</strong> contient plus d'un caractère. Elle sera donc tronquée.",true);
				out.value = matches[1][0];
				out.categorie = 'value';
				out.type = 'caractère';
			}
			else if(value.match(/^(Vrai|Faux)$/i) != null) //booléen
			{
				out.value = (value.toLowerCase == 'vrai');
				out.categorie = 'value';
				out.type = 'booléen';
			}
			else if((matches = value.match(/^([a-z0-9_]+)$/i)) != null) //Variable
			{
				//Get type
					if(this.varsTypes[matches[1]] == undefined)
					{
						this.addError(this.line, "La variable <strong>" + matches[1] + "</strong> n'est pas définie");
						return false;
					}
					out.categorie = 'value';
					out.type = this.varsTypes[matches[1]];
				//Get value
					if(this.varsValues[matches[1]] == undefined)
					{
						this.addError(this.line, "La variable <strong>" + matches[1] + "</strong> n'a pas de valeur",true);
						//Set default value
						if(this.varsTypes[matches[1]] == 'booléen')
							out.value = 'Faux';
						else
							out.value = 0;
					}
					else
						out.value = this.varsValues[matches[1]];
			}
			else
			{
				this.addError(this.line, "Je ne comprend pas la signification de cet enchainement de caractères : <strong>" + value + "</strong>.");
				return false;
			}
			return out;
		}

		this.evaluateExpression = function (expressionObject) 
		{
			var input = expressionObject;
			//Remove () if they are useless
			if(input[0].categorie == '(' && input[input.length-1].categorie == ')')
			{
				input.shift();
				input.pop();
			}
			//If only one value
			if(input.length == 1 && input[0].categorie == 'value')
				return input[0];
			//Find the operation with less priority
				var lastType;
				var lastTypeI;
				var lowestOperatorLevel = 0;
				var lowestOperatorI = -1;
				var parentheseLevel = 0;
				for (var i = input.length - 1; i >= 0; i--) 
				{
					//Check operator/value alternation
					if(input[i].categorie == 'value' && lastType == 'value')
					{
						this.addError(this.line, "J'essaye de calculer cette expression : <strong>" + this.expressionString(input) + "</strong> mais j'ai trouvé deux valeurs qui se suivent <strong>" + this.valueobjToString(input[i]) + "</strong> et <strong>" + this.valueobjToString(input[lastTypeI]) + "</strong> alors que toutes les valeurs doivent être séparés par un opérateur.");
						return false;
					}
					if(input[i].categorie == 'operator' && lastType == 'operator')
					{
						this.addError(this.line, "J'essaye de calculer cette expression : <strong>" + this.expressionString(input) + "</strong> mais j'ai trouvé deux opérateurs qui se suivent <strong>" + this.valueobjToString(input[i]) + "</strong> et <strong>" + this.valueobjToString(input[lastTypeI]) + "</strong> alors que tous les opérateur doivent être séparés par une valeur.");
						return false;
					}
					if(input[i].categorie == 'value' || input[i].categorie == 'operator')
					{
						lastType = input[i].categorie;
						lastTypeI = i;
					}
					//Find the operation with less priority
					if(input[i].categorie == '(' || input[i].categorie == 'function')
						parentheseLevel++;
					if(input[i].categorie == ')')
						parentheseLevel--;
					if(!parentheseLevel)
					{						
						if(input[i].categorie == 'operator' && input[i].type > lowestOperatorLevel)
						{
							lowestOperatorLevel = input[i].type;
							lowestOperatorI = i;
						}
					}
				};
				//if founded one
				if(!parentheseLevel && lowestOperatorI != -1)
				{
					//Calculate
					return this.calculate(
						this.evaluateExpression(input.slice(0,lowestOperatorI)),
						input[lowestOperatorI].value,
						this.evaluateExpression(input.slice(lowestOperatorI+1)))
				}

		}

		this.calculate = function (valueObj1, operator, valueObj2) 
		{
			if(valueObj1 == false || valueObj2 == false)
				return false;
			var out = new Object();
			out.categorie = 'value';
			//Check types
				if($.inArray(operator, Array('+','-','*','/')) != -1)
				{
					if($.inArray(valueObj1.type, Array('réel','entier')) == -1 || $.inArray(valueObj2.type, Array('réel','entier'))  == -1)
					{
						this.addError(this.line, "L'opperation suivante a été faite : <br/><strong>" 
								+ this.valueobjToString(valueObj1) + " " + operator + " " + this.valueobjToString(valueObj2) + "</strong> ayant pour types <strong>&lt;" 
								+ valueObj1.type + "&gt; " + operator + " &lt;" + valueObj2.type + "&gt;</strong><br/>"
								+ "Or cet opérateur ne supporte que les <strong>réels</strong> ou les <strong>entiers</strong>");
						return false;
					}
					//Output type
					if(valueObj1.type == 'entier' && valueObj2.type == 'entier' && operator != '/')
						out.type = 'entier';
					else
						out.type = 'réel';
				}
				else if(operator == '%')
				{
					if(valueObj1.type != 'entier' || valueObj2.type != 'entier')
					{
						this.addError(this.line, "L'opperation suivante a été faite : <br/><strong>" 
								+ this.valueobjToString(valueObj1) + " " + operator + " " + this.valueobjToString(valueObj2) + "</strong> ayant pour types <strong>&lt;" 
								+ valueObj1.type + "&gt; " + operator + " &lt;" + valueObj2.type + "&gt;</strong><br/>"
								+ "Or cet opérateur ne supporte que les <strong>entiers</strong>");
						return false;
					}
					//Output type
					out.type = 'entier';
				}
				else if($.inArray(operator, Array('=','!=','<=','>=','<','>')) != -1)
				{
					//If types are not same AND they are not both (réel or entier)
					if(valueObj1.type != valueObj2.type && ($.inArray(valueObj1.type, Array('réel','entier')) == -1 || $.inArray(valueObj2.type, Array('réel','entier'))  == -1))
					{
						this.addError(this.line, "L'opperation suivante a été faite : <br/><strong>" 
								+ this.valueobjToString(valueObj1) + " " + operator + " " + this.valueobjToString(valueObj2) + "</strong> ayant pour types <strong>&lt;" 
								+ valueObj1.type + "&gt; " + operator + " &lt;" + valueObj2.type + "&gt;</strong><br/>"
								+ "Or cet opérateur ne comparer que des éléments du même type (exception faite pour les réels et les entiers qui peuvent être comparés)");
						return false;
					}
					//Output type
					out.type = 'booléen';
				}
				else if($.inArray(operator, Array('ET','OU')) != -1)
				{
					if($.inArray(valueObj1.type, Array('booléen')) == -1 || $.inArray(valueObj2.type, Array('booléen'))  == -1)
					{
						this.addError(this.line, "L'opperation suivante a été faite : <br/><strong>" 
								+ this.valueobjToString(valueObj1) + " " + operator + " " + this.valueobjToString(valueObj2) + "</strong> ayant pour types <strong>&lt;" 
								+ valueObj1.type + "&gt; " + operator + " &lt;" + valueObj2.type + "&gt;</strong><br/>"
								+ "Or cet opérateur ne supporte que les <strong>booléen</strong>");
						return false;
					}
					//Output type
					out.type = 'booléen';
				}
				else
				{
					this.addError(this.line, "L'opperation suivante a été faite : <br/><strong>" 
							+ this.valueobjToString(valueObj1) + " " + operator + " " + this.valueobjToString(valueObj2) + "</strong> ayant pour types <strong>&lt;" 
							+ valueObj1.type + "&gt; " + operator + " &lt;" + valueObj2.type + "&gt;</strong><br/>"
							+ "Or cet opérateur n'existe pas.");
					return false;
				}
					//calculate
						var result;
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
								out.value = valueObj1.value / valueObj2.value;
								break;
							case '%':
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
								this.addError(this.line, "L'opperation suivante a été faite : <br/><strong>" 
									+ this.valueobjToString(valueObj1) + " " + operator + " " + this.valueobjToString(valueObj2) + "</strong> ayant pour types <strong>&lt;" 
										+ valueObj1.type + "&gt; " + operator + " &lt;" + valueObj2.type + "&gt;</strong><br/>"
										+ "Or cet opérateur n'existe pas.");
								return false;
								break;
						}
			return out;
		}

		this.expressionString = function (expressionObject) 
		{
			var output = '';
			for (var i = 0; i < expressionObject.length; i++) {
					output += this.valueobjToString(expressionObject[i]) + ' ';
			};
			return output;
		}

		this.valueobjToString = function (valueObj, quotes = true) 
		{
			if(valueObj.type == 'caractère')
			{
				if(quotes)
					return '\'' + valueObj.value + '\'';
				else
					return valueObj.value;
			}
			if(valueObj.type == 'string')
			{
				if(quotes)
					return '"' + valueObj.value + '"';
				else
					return valueObj.value;
			}
			if(valueObj.type == 'booléen')
				return (valueObj.value)? 'Vrai' : 'Faux';
			else
				return valueObj.value;
		}

		//Execute the next instruction
		this.nextLine = function()
		{
			this.disableEditor(true);
			//Get the line value and remove white spaces from start and end of the string
				var instruction = this.editor.getLine(this.line);
				//if the algorithme reach the end
				if(this.line == -1)
					return;
				if(instruction == undefined)
				{
					$('#sortie').append('<li class="list-group-item list-group-item-success"><u>Ligne ' + (this.line+1) + '</u> : L\'algorithme s\'est terminé correctement</li>');
					this.line = -1;
					this.setActualLine(-1);
					this.disableEditor(false);
					this.loopMode = false;
					return;
				}
				//ignore if the line is empty
				instruction = instruction.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
				if(instruction != "" && instruction.substr(0,2) != "//")
				{
					//Wait for "Algorithme <Nom>"
						if(this.mode == 0)
						{
							var matches = /^Algorithme\s+([^ "']+)$/i.exec(instruction);
							if(matches != null){
								this.mode++;
								$('#sortie').append('<li class="list-group-item list-group-item-success"><u>Ligne ' + (this.line+1) + '</u> : Début de l\'algorithme <strong>' + matches[1].replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;") + '</strong></li>');
							}
							else
							{
								this.addError(this.line, "L'algorithme ne commence pas par <strong>Algorithme Nom_algorithme</strong>");
								this.line = -1;
								return;
							}
						}
					//Wait for "Types:" or "Variables:" or "Instructions:"
						else if(instruction.toLowerCase() == 'types:' || instruction.toLowerCase() == 'variables:' || instruction.toLowerCase() == 'instructions:')
						{
							switch(this.mode) //this.mode cannot decrement, but it can jump one or two this.mode
							{
								case 1:
									if(instruction.toLowerCase() == "types:"){
										this.mode = 2;
										break;}
								case 2:
									if(instruction.toLowerCase() == "variables:"){
										this.mode = 3;
										break;}
								case 3:
									if(instruction.toLowerCase() == "instructions:"){
										this.mode = 4;
										break;}
								default:
									this.addError(thisthis.inputWait.line, 'Je m\'attendais à trouver <strong>Types:</strong>, <strong>Variables:</strong> ou <strong>Instructions:</strong> dans cet ordre mais ça n\'a pas été le cas');
									this.line = -1;
									return;
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
								var type = RegExp.$2.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
								//TODO : check if type is known
								//Split vars
								vars = vars.split(',');
								for (var j = 0; j < vars.length; j++) 
								{
									vars[j] = vars[j].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
									//Check if there is alway something between ","
									if(vars[j] == "")
										addError(this.line, 'Apparement, il y a une virgule en trop !', true);
									else
									{
										//Check if var not already defined
											if(this.varsTypes[vars[j]] == undefined)
											{
												this.varsNames.push(vars[j])
												this.varsTypes[vars[j]] = type.toLowerCase();
											}
											else{
												addError(this.line, 'La variable <strong>' + vars[j] + '</strong> a déjà été définie');
												this.line = -1;
												return;
											}
										//add to the trace table
										$('#trace').find('tbody').append('<tr><th>' + vars[j] + '</th></tr>');
									}
								}
							}
							else
								this.addError(this.line, 'Cette ligne doit être au format <strong>var1 : type</strong>');

						}
					//if Instructions this.mode
						else if(this.mode == 4)
						{
							//init screen & keyboard output
								if(this.traceScreenLine == -1)
								{
									$('#trace').find('tbody').append('<tr><th>Écran</th></tr>');
									$('#trace').find('tbody').append('<tr><th>Clavier</th></tr>');
									this.traceScreenLine = $('#trace').find('tbody').length-1;
								}
							//Find instruction
							var screenOutput = '';
							var keyboardInput = '';
							var matches;
							if((matches = instruction.match(/^([a-z0-9_]+)\s*<-\s*(.+)$/i)) != null) // <var> <- <expression>
							{
								//Get type
									if(this.varsTypes[matches[1]] == undefined)
									{
										this.addError(this.line, "La variable <strong>" + matches[1] + "</strong> n'est pas définie");
										return false;
									}
									var type = this.varsTypes[matches[1]];
								//execute expression
									var valueObj = this.executeExpression(matches[2]);
									if(valueObj == false)
										return false;
								//Check type
									if(valueObj.type != type && (valueObj.type == 'réel' && type == 'entier'))
									{
										this.addError(this.line, "Vous ne pouvez pas assigner une valeur de type <strong>&lt;" + valueObj.type + "&gt;</strong> à une variable de type <strong>&lt;" + type + "&gt;</strong>.");
										return false;
									}
								//Set var
									this.varsValues[matches[1]] = valueObj.value;

							}
							else if((matches = instruction.match(/^[ée]crire\s*\(\s*(.+)\s*!\s*\)$/i)) != null) // Ecrire(<expression>,<expression>, ... !)
							{
								var params = matches[1].splitUnquotted(',');
								screenOutput = '';
								for (var i = 0; i < params.length; i++) {
									screenOutput += this.valueobjToString(this.executeExpression(params[i]),false);
								};
								$('#sortie').append('<li class="list-group-item">' + screenOutput + '</li>');
								//scroll to the message TODO replace by function(element, scrollingArea, viewHeight)
									//If the element is below the screen
									if($('html, body').scrollTop() < ($('#sortie').children('li').last().offset().top + $('#sortie').children('li').last().height() - $( window ).height()))
										$('html, body').scrollTop($('#sortie').children('li').last().offset().top + $('#sortie').children('li').last().height() - $( window ).height() )
									//else if the element is above
									else if($('html, body').scrollTop() > $('#sortie').children('li').last().offset().top)
										$('html, body').scrollTop($('#sortie').children('li').last().offset().top)						
							
							}
							else if((matches = instruction.match(/^lire\s*\(\s*(.+)\s*!\s*([a-z0-9_]+)\s*\)$/i)) != null) // Lire(<source> ! <sortie>)
							{
								//source
								matches[1] = matches[1].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
								if(matches[1].toLowerCase() != 'clavier')
								{
									this.addError(this.line, 'Je ne sais pas lire depuis <strong>' + matches[1] + '</strong>. Remplacez cette source par <strong>clavier</strong> si vous souhaitez que je récupère les touches du clavier.');
									return false;
								}
								//destination var
								matches[2] = matches[2].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
								if(this.varsTypes[matches[2]] == undefined)
								{
									this.addError(this.line, "La variable <strong>" + matches[2] + "</strong> n'est pas définie");
									return false;
								}
								if(this.inputValue == '' && !this.inputCreated)
								{
									$('#sortie').append('<li class="list-group-item"><div class="input-group"><input type="text" class="form-control input-l'+this.line+' input-submit"/> '
										+ '<span class="input-group-btn"><button class="btn btn-default btn-submit" type="button">Envoyer !</button></span></div></li>');
									this.inputCreated = true;
									$('#sortie').find('.input-l' + this.line)[0].focus();
									return false;
								}
								if(this.inputSubmited)
								{
									keyboardInput = this.inputValue;
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
												this.addError(this.line,'La valeur donnée par l\'utilisateur <strong>' + this.inputValue + '</strong> n\'est pas un réel')
												return false;
											}
											this.inputValue = '';
											break;
										case 'entier':
											this.varsValues[matches[2]] = parseInt(this.inputValue);
											if(isNaN(this.varsValues[matches[2]]))
											{
												this.addError(this.line,'La valeur donnée par l\'utilisateur <strong>' + this.inputValue + '</strong> n\'est pas un entier')
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
							else
							{
								this.addError(this.line, "Je ne comprend pas cette instruction : <strong>" + instruction + "</strong>");
								return false;
							}

							//Add column in the trace
								$('#trace').children('thead').children('tr').append('<th>' + (this.line+1) + '</th>')
								var that = this;
								var traceLine = 0;
								$.each(this.varsNames, function(index, value){
									if( that.varsLastValues[value] != that.varsValues[value] )
									{
										var valueObj = new Object();
										valueObj.value = that.varsValues[value];
										valueObj.type = that.varsTypes[value];
										valueObj.categorie = 'value';
										$('#trace').children('tbody').children('tr').eq(traceLine).append('<td>' + that.valueobjToString(valueObj)	 + '</td>')
										that.varsLastValues[value] = that.varsValues[value];
									}
									else
										$('#trace').children('tbody').children('tr').eq(traceLine).append('<td></td>')
									traceLine ++;
								});
							//Screen output 
								if(screenOutput.length >= 10)
									screenOutput = screenOutput.substr(0,10) + '...';
								$('#trace').children('tbody').children('tr').eq(traceLine).append('<td>' + screenOutput + '</td>');
								if(screenOutput != '')
									screenOutput = '';
							//keyboard input
								if(keyboardInput.length >= 10)
									keyboardInput = keyboardInput.substr(0,10) + '...';
								$('#trace').children('tbody').children('tr').eq(traceLine+1).append('<td>' + keyboardInput + '</td>');
								if(keyboardInput != '')
									keyboardInput = '';
								
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
				var that = this;
				if(this.loopMode)
		     		setTimeout(function(){that.nextLine()}, 0);
		}


		this.next = function()
		{
			this.loopMode = false;
			this.nextLine();
		}

		//execute until the end
		this.start = function()
		{
			//Buttons style
				$('.btn-start').addClass('btn-pause')
				$('.btn-start').html('<span class="glyphicon glyphicon-pause"></span> Mettre en pause')
				$('.btn-start').removeClass('btn-start')
				$('.btn-stop').removeAttr('disabled')
				$('.btn-next').attr('disabled','disabled')
			//Start interpreter
				this.loopMode = true;
				this.nextLine();
		}

		this.submit = function()
		{
			if(this.inputCreated && !this.inputSubmited)
			{
				$('#sortie').find('.input-l' + this.line).attr('disabled','disabled');
				$('#sortie').find('.input-l' + this.line).parent().find('button').attr('disabled','disabled');
				this.inputValue = $('#sortie').find('.input-l' + this.line)[0].value
				this.inputCreated = true;
				this.inputSubmited = true;
				this.nextLine();
			}
		}


		this.pause = function()
		{
			$('.btn-pause').addClass('btn-start')
			$('.btn-pause').html('<span class="glyphicon glyphicon-play"></span> Lancer')
			$('.btn-pause').removeClass('btn-pause')
			$('.btn-next').removeAttr('disabled')
			this.loopMode = false;
		}


		this.reset = function()
		{
			this.editor.toTextArea()
			this.init();
		}

		this.disableEditor = function(disable)
		{
			if(disable)
			{
				$('.CodeMirror').css('background-color', '#515151');
				$('.CodeMirror-gutters').css('background-color', '#5a5a5a');
				this.editor.setOption("readOnly", true);
			}
			else
			{
				$('.CodeMirror').css('background-color', '#2c2827');
				$('.CodeMirror-gutters').css('background-color', '#34302f');
				this.editor.setOption("readOnly", false);
			}
		}


	}




	scrollLikeFocus = function(element, scrollingArea, viewHeight)
	{
		//If the element is below the view
		if(scrollingArea.scrollTop() < (element.offset().top + element.height() - viewHeight))
			scrollingArea.scrollTop(element.offset().top + element.height() - viewHeight)
		//else if the element is above
		else if(scrollingArea.scrollTop() > element.offset().top)
			scrollingArea.scrollTop(element.offset().top)		
	}



});
//Split with ignore when between "" or ''
String.prototype.splitUnquotted = function(separator)
{
	var out = []
	out[0] = '';
	stringMode = false;
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
			if(this[i] == separator)
				out[out.length] = '';
			else if(this[i] == '\'' || this[i] == '"')
			{
				out[out.length-1] += this[i];
				stringMode = this[i];
			}
			else 
				out[out.length-1] += this[i];
		}
	};
	return out;
}

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