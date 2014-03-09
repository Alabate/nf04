/*
    This code is based on the vbscript mode
*/
CodeMirror.defineMode("nf04", function(conf, parserConf) 
{
    var STYLE = {};
    STYLE.ERROR = 'error';
    STYLE.VARIABLE = 'variable';
    STYLE.FUNCTION = 'function'; //Function/Algo name
    STYLE.MODE = 'mode';
    STYLE.KEYWORD = 'keyword'; //Si, Sinon, Tant Que
    STYLE.TYPE = 'type';
    STYLE.COMMENT = 'comment';
    STYLE.SPACE = 'space';
    STYLE.OPERATOR = 'operator';
    STYLE.SEPARATOR = 'separator';
    STYLE.NUMBER = 'number';
    STYLE.STRING = 'string';
    STYLE.BRACKET = 'bracket';
    STYLE.ERRORSOFT = 'error'; //this can become an error in not finished


    // tokenizers
    function tokenBase(stream, state) {

        //Get precedent char
        var precedent = stream.string[stream.pos-1];
        if(precedent === undefined){ 
            precedent = '';
        }

        //set mode
        if(state.mode === 0 && stream.sol() && stream.match(/^\s*Algorithme\s/i)) {
            state.mode = 1;
            return STYLE.MODE;
        } 
        if(stream.sol() && stream.match(/^\s*(Variables|types|instructions)\s*:\s*$/i, false)) 
        {
            switch(state.mode) //mode cannot decrement, but it can jump one or two mode
            {
                case 1:
                    if(stream.match(/^\s*types\s*:\s*$/i)) {
                        state.mode = 2;
                        return STYLE.MODE;
                    }
                    /* falls through */
                case 2:
                    if(stream.match(/^\s*variables\s*\s*:$/i)) {
                        state.mode = 3;
                        return STYLE.MODE;
                    }
                    /* falls through */
                case 3:
                    if(stream.match(/^\s*instructions\s*:\s*$/i)){
                        state.mode = 4;
                        return STYLE.MODE;
                    }
                    /* falls through */
                default:
                    stream.skipToEnd();
                    state.mode = -1; // Error mode
                    return STYLE.ERROR;
            }
        }

        //Ignore spaces
        if (stream.eatSpace()) {
            return STYLE.SPACE;
        }

        // Handle Comments
        if (stream.match(/^\/\//)){
            stream.skipToEnd();
            return STYLE.COMMENT;
        }


        //If Error mode, paint everything in error
        if(state.mode == -1)
        {
            stream.skipToEnd();
            return STYLE.ERROR;
        }

        // nothing should be here (except a another "mode keyword")
        else if(state.mode == 1) 
        {
            if(state.lastToken.style == STYLE.MODE && stream.match(/^\s*[^\s"']+\s*/i))
            {
                return STYLE.FUNCTION;
            }
            else
            {
                stream.skipToEnd();
                return STYLE.ERROR;
            }
        }

        // nothing can be here (type mode doesnt work yet)
        else if(state.mode == 2) 
        {
            stream.skipToEnd();
            return STYLE.ERROR;
        }

        // Variable mode "var, var, var : type"
        else if(state.mode == 3) 
        {
            if(state.lastToken.style == STYLE.VARIABLE && stream.match(/^(,|:)/i))
            {
                stream.eatSpace();
                return STYLE.SEPARATOR;
            }
            else if(state.lastToken.content.match(/^:\s*/i) && stream.match(/^(entiers?|r[ée]els?|caract[èe]res?|bool[ée]ens?)/i))
            {
                stream.eatSpace();
                return STYLE.TYPE;
            }            
            else if((state.lastToken.style == STYLE.SEPARATOR || stream.sol() || state.lastToken.style == STYLE.SPACE)
                && stream.match(/^[a-z][a-z0-9_]*/i))
            {
                stream.eatSpace();
                return STYLE.VARIABLE;
            }
        }

        // mode instructions
        if(state.mode == 4) 
        {

            //Parentheses 
            if(stream.match(/[()]/))
            {
                return STYLE.BRACKET;
            }
            //SEPARATORs
            if(stream.match(/[,!]/))
            {
                return STYLE.SEPARATOR;
            }

            //Strings
            if(stream.match(/"/))
            {
                while (!stream.eol()) 
                {   
                    stream.eatWhile(/[^"]/);
                    //console.log(stream.next());
                    if ((stream.string[stream.pos-1] != '\\' || stream.string[stream.pos-2] == '\\' )
                        && stream.next() == '"')
                    {
                        return STYLE.STRING;
                    }
                    else
                    {
                        stream.next();
                    }
                }
                return (STYLE.ERRORSOFT + ' ' + STYLE.STRING);
            }

            //Char
            if(stream.match(/'/))
            {
                while (!stream.eol()) 
                {   
                    stream.eatWhile(/[^']/);
                    //console.log(stream.next());
                    if ((stream.string[stream.pos-1] != '\\' || stream.string[stream.pos-2] == '\\' )
                        && stream.next() == '\'')
                    {
                        return STYLE.STRING;
                    }
                    else
                    {
                        stream.next();
                    }
                }
                return (STYLE.ERRORSOFT + ' ' + STYLE.STRING);
            }

            //Keywords
            if(stream.match(/(si|alors|sinon|sinonsi|finsi|tant|que|faire|fintq|pour|allant|de|à|par pas de|finpour|clavier)/i))
            {
                return STYLE.KEYWORD;
            }
            //Operator
            if(stream.match(/[\+-\/\*<>=!]/i))
            {
                return STYLE.OPERATOR;
            }

            //Vars & functions
            if(!precedent.match(/^[a-z0-9_]$/) && stream.match(/^[a-z][a-z0-9_]*/i)) {
                stream.eatSpace();
                if(stream.peek() == '(')
                {
                    return STYLE.FUNCTION;
                }
                else
                {
                    return STYLE.VARIABLE;
                }
            }

            //Numbers
            //hex
            if(!precedent.match(/^[0-9]$/) && stream.match(/^0x[0-9a-f]+(?![0-9a-fa-z_\.])/i)) {
                return STYLE.NUMBER;
            }
            //int - put 0 as first digit is not recommanded because it is octal notation in some language (not in NF04)
            if(stream.match(/^[1-9][0-9]*(?![0-9a-z_\.])/i)) {
                return STYLE.NUMBER;
            }
            //zero
            if(stream.match(/^0(?![0-9a-z_\.])/i)) {
                return STYLE.NUMBER;
            }
            //float
            if(!precedent.match(/^[0-9]$/) && stream.match(/^[0-9]*\.[0-9]+(?![a-z_\.])/i)) {
                return STYLE.NUMBER;
            }
        }



        // Handle non-detected items
        stream.next();
        return STYLE.ERROR;
    }


    var external = {
        //TODO electricChars:"dDpPtTfFeE ",
        startState: function() {
            return {
              tokenize: tokenBase,
              lastToken: null,
              currentIndent: 0,
              nextLineIndent: 0,
              doInCurrentLine: false,
              ignoreKeyword: false, 

              mode: 0
          };
        },

        token: function(stream, state) {
            var style = state.tokenize(stream, state);
            state.lastToken = {style:style, content: stream.current()};

            return style;
        }/*,

        indent: function(state, textAfter) {
            
            var trueText = textAfter.replace(/^\s+|\s+$/g, '') ;
            if (trueText.match(closing) || trueText.match(doubleClosing) || trueText.match(middle)) return conf.indentUnit*(state.currentIndent-1);
            if(state.currentIndent < 0) return 0;
            return state.currentIndent * conf.indentUnit;
        }*/

    };
    return external;
});
