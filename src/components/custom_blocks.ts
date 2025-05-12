import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// resource 블록
Blockly.Blocks['hcl_resource'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField("resource")
            .appendField(new Blockly.FieldTextInput("aws_instance"), "TYPE");
        this.appendDummyInput()
            .appendField("name")
            .appendField(new Blockly.FieldTextInput("example"), "NAME");
        this.appendStatementInput("ATTRIBUTES")
            .setCheck(null)
            .appendField("attributes");
        this.setColour(230);
        this.setTooltip("HCL resource 블록");
        this.setHelpUrl("");
    }
};

// attribute 블록
Blockly.Blocks['hcl_attribute'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField(new Blockly.FieldTextInput("ami"), "KEY")
            .appendField("=")
            .appendField(new Blockly.FieldTextInput("ami-123456"), "VALUE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("HCL 속성");
        this.setHelpUrl("");
    }
};

// variable 블록
Blockly.Blocks['hcl_variable'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField("variable")
            .appendField(new Blockly.FieldTextInput("name"), "NAME");
        this.appendStatementInput("ATTRIBUTES")
            .setCheck(null)
            .appendField("attributes");
        this.setColour(290);
        this.setTooltip("HCL variable 블록");
        this.setHelpUrl("");
    }
};

// output 블록
Blockly.Blocks['hcl_output'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField("output")
            .appendField(new Blockly.FieldTextInput("name"), "NAME");
        this.appendStatementInput("ATTRIBUTES")
            .setCheck(null)
            .appendField("attributes");
        this.setColour(120);
        this.setTooltip("HCL output 블록");
        this.setHelpUrl("");
    }
};

// module 블록
Blockly.Blocks['hcl_module'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField("module")
            .appendField(new Blockly.FieldTextInput("module_name"), "NAME");
        this.appendStatementInput("ATTRIBUTES")
            .setCheck(null)
            .appendField("attributes");
        this.setColour(180);
        this.setTooltip("HCL module 블록");
        this.setHelpUrl("");
    }
};

// resource 블록 생성기
javascriptGenerator.forBlock['hcl_resource'] = function (block: Blockly.Block) {
    const type = block.getFieldValue('TYPE');
    const name = block.getFieldValue('NAME');
    const attributes = javascriptGenerator.statementToCode(block, 'ATTRIBUTES');
    return `resource "${type}" "${name}" {\n${attributes}}\n`;
};

// attribute 블록 생성기
javascriptGenerator.forBlock['hcl_attribute'] = function (block: Blockly.Block) {
    const key = block.getFieldValue('KEY');
    const value = block.getFieldValue('VALUE');
    return `  ${key} = "${value}"\n`;
};

// variable 블록 생성기
javascriptGenerator.forBlock['hcl_variable'] = function (block: Blockly.Block) {
    const name = block.getFieldValue('NAME');
    const attributes = javascriptGenerator.statementToCode(block, 'ATTRIBUTES');
    return `variable "${name}" {\n${attributes}}\n`;
};

// output 블록 생성기
javascriptGenerator.forBlock['hcl_output'] = function (block: Blockly.Block) {
    const name = block.getFieldValue('NAME');
    const attributes = javascriptGenerator.statementToCode(block, 'ATTRIBUTES');
    return `output "${name}" {\n${attributes}}\n`;
};

// module 블록 생성기
javascriptGenerator.forBlock['hcl_module'] = function (block: Blockly.Block) {
    const name = block.getFieldValue('NAME');
    const attributes = javascriptGenerator.statementToCode(block, 'ATTRIBUTES');
    return `module "${name}" {\n${attributes}}\n`;
};