import puppeteer from 'puppeteer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require("fs");

// Read the config.json file
const configData = fs.readFileSync('config.json');
const config = JSON.parse(configData);
console.log("Config: "+JSON.stringify(config))

const HEADLESS = config.HEADLESS; // invisible browser. debug with 'false'
var DELAY = config.DELAY; //delay in ms between each action
//demo URL = 'file:///Users/ehudbarkai/Documents/puppeteer/demo.html'
var URL = config.URL
const COMPANY = config.COMPANY
const USER = config.USER
const PASSWORD = config.PASSWORD
const FIXED = config.FIXED
const START_HOUR = config.START_HOUR
const END_HOUR = config.END_HOUR
const COMMENT = config.COMMENT
const AUTO_CLOSE = config.AUTO_CLOSE
//const LOGIN = false;
const LOGIN = config.LOGIN
var CSV_FILE = config.CSV_FILE
var SAVE = true


/* Delay the coderun in X milliseconds
    Usage: async delay(x)
    Example: async delay(1000)
    */
async function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }

 /* Convert a CSV to JSON object */
 async function csv2json(csvFilePath)
 {
    const csv=require('csvtojson')
    /*csv()
    .fromFile(csvFilePath)
    .then((jsonObj)=>{})
    // Async / await usage*/
    const jsonArray=await csv().fromFile(csvFilePath);
    return jsonArray;
 }

/* Demo for puppeteer actions */
async function puppeteer_demo(){
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto('https://developer.chrome.com/');


    // Set screen size
    await page.setViewport({width: 1080, height: 1024});

    // Type into search box
    await page.type('.devsite-search-field', 'automate beyond recorder');

    // Wait and click on first result
    const searchResultSelector = '.devsite-result-item-link';
    await page.waitForSelector(searchResultSelector);
    await page.click(searchResultSelector);

    // Locate the full title with a unique string
    const textSelector = await page.waitForSelector(
        'text/Customize and automate'
    );
    const fullTitle = await textSelector?.evaluate(el => el.textContent);

    // Print the full title
    console.log('The title of this blog post is "%s".', fullTitle);

    await browser.close();
}

async function main() {
    
    // Reverse the date_array and look for the LAST date which equals to given file_date.
    async function find_date_row(date_array, file_date) {
        date_array.reverse()
        for (const date_input of date_array){
            const date_input_value = await (await date_input.getProperty('value')).jsonValue();
            const date_input_id =  await (await date_input.getProperty('id')).jsonValue();
            //console.log(date_input_value);
            //console.log(date_input_id);
            if (date_input_value === file_date) {
                console.log("found it")
                const date_input_row = date_input_id.split(":")[2];
                console.log("date "+file_date+" is in row "+date_input_row)
                return date_input_row
            }
        }
        // Invalid date in file
        console.log("ERROR - date in csv "+file_date+" is invalid, not found in website")
        throw new Error("Invalid date in csv file");
    }

    async function write_input(page,selector_prefix,row_num,selector_suffix,text) {
        const selector = selector_prefix+row_num+selector_suffix;
        const input = await page.waitForSelector(selector);
        await input.focus();
        await delay(DELAY);
        await input.type(text);
        await delay(DELAY);
    }

    async function write_hours_line(page,row_num,from_text,to_text,comment){
        await write_input(page,'input[id^="pt1:dataTable:',row_num,'"][id*="clockInTime::content"]:not(.p_AFDisabled)',from_text);
        await write_input(page,'input[id^="pt1:dataTable:',row_num,'"][id*="clockOutTime::content"]:not(.p_AFDisabled)',to_text);
        await write_input(page,'input[id^="pt1:dataTable:',row_num,'"][id*="remarkInput"]:not(.p_AFDisabled)',COMMENT);
        return true;
    }

    // fill_form_row(row):
    // 1. Read line's date
    // 2. Find line's date in payroll page, last apperence, and get the line number
    // 3. Find if this line has already an hour
    // If yes, create a new line, and set line_number+1
    // If not, continue
    // 4. Write the content through write_hours(rownum,start,end,comment)
    //
    // write_hours(rownum,start,end,comment)
    // goto DOMs in rownum, focus on them and put content
    async function fill_form_row(page,file_row) {
        const file_date = file_row['Date'];
        const from_text = file_row['From'];
        const to_text = file_row['To'];

        console.log("filling row:"+file_date+","+from_text+","+to_text);
        // Loop through column 'DATE' DOMs
        var selector = 'input[id^="pt1:dataTable:"][id*="clockInDate"]:not(.p_AFDisabled)'
        await page.waitForSelector(selector);
        const date_array = await page.$$(selector);

        var date_row_num = await find_date_row(date_array, file_date);
        console.log("date_row:"+date_row_num);
        const start_hour_selector = 'input[id^="pt1:dataTable:'+date_row_num+':"][id*="clockInTime::content"]:not(.p_AFDisabled)'
        const start_hour = await page.waitForSelector(start_hour_selector);
        await page.focus(start_hour_selector);
        await delay(2000) 
        await page.click(start_hour_selector);
        const start_hour_value = await (await start_hour.getProperty('value')).jsonValue();
        console.log("start_hour_value: "+start_hour_value);
        if (start_hour_value == '') {
            console.log("empty, fill this row");
        }
        else {
            console.log("not empty, create a new row");
            await page.click('[id^="pt1:addRowButton"]')
            await delay(2000)
            date_row_num++;
        }

        

        await write_hours_line(page,date_row_num,from_text,to_text,COMMENT);  
    }

    /* 
    This function fills up the web site of MALAM Payroll with hours from CSV file
    */
    async function malam_payroll_csv(hours_file) {
        const browser = await puppeteer.launch({ headless: HEADLESS });
        const page = await browser.newPage();

        // Navigate the page to a URL
        await page.goto(URL)

        // Run login process
        if (LOGIN) {
            await delay(DELAY)
            // LoginPhase
            // Check if not already logged in
            // '#titleLogin>label' exists && '#titleLogin>label'.textContent == "כניסה למערכת"
    
            const login_title_selector = '#titleLogin>label'
            // Reached login successfully
            await page.waitForSelector(login_title_selector);
            await delay(DELAY)
            if (await page.$(login_title_selector) !== null) {
                await delay(DELAY)
                const title = await page.$("#titleLogin>label")
                const title_text = await (await title.getProperty('textContent')).jsonValue()
                console.log("title:"+title_text);
                if (title_text=="כניסה למערכת") {
                    console.log("Login is possible")
                    const company_select = 'input[id^="indexNumInput"]'
                    const user_selector = 'input[id^="useridInput"]'
                    const password_selector = 'input[id^="it2"]'
                    const login_button_selector = 'a#loginButton'
    
                    const hours_form_button_selector = 'tr[id^="pt1:timesheet"]>td:nth-child(2)'

                    await page.waitForSelector(company_select);
                    await page.waitForSelector(user_selector);
                    await page.waitForSelector(password_selector);
                    //login form DOM id:
                    //input[id^="indexNumInput"]
                    //input[id^="useridInput"]
                    //input[id^="it2"]')
                    await delay(DELAY)
                    await page.type(company_select,COMPANY)
                    await delay(DELAY)
                    await page.type(user_selector,USER)
                    await delay(DELAY)
                    await page.type(password_selector,PASSWORD)
                    await delay(DELAY)
                    // Login button id = #loginButton
                    await page.waitForSelector(login_button_selector);
                    await page.click(login_button_selector);
                    await delay(2000)
    
                    //Login completed
                    //Click on hours form button
                    const hours_page = await page.waitForSelector(hours_form_button_selector);
                    await hours_page.evaluate(b => b.click());
                    //await page.click(hours_form_button_selector);
                }
                else {
                    console.log("bad login page")
                    process.exit(1);
                }
            }
            else {
                console.log("login page not found")
                process.exit(1);
            }   
            await delay(2000)
        }

        for (const file_row of hours_file) {
            await fill_form_row(page,file_row);
        }

        await delay(DELAY);
        // Save the page
        await page.click('[id^="pt1:saveButton"]')
        await delay(500)
        // Normally you want the browser to be closed afterwards
        if (AUTO_CLOSE) {
            await browser.close();
        }
        console.log("Payroll automotion DONE")
        
        console.log("ALL DONE");
    }

    /* 
    This function fills up the web site of MALAM Payroll with fixed hours
    */
    async function malam_payroll_fixed() {
        const browser = await puppeteer.launch({ headless: HEADLESS });
        const page = await browser.newPage();

        // Navigate the page to a URL
        //await page.goto('file:///Users/ehudbarkai/Documents/puppeteer/demo.html');
        await page.goto(URL)

        // Run login process
        if (LOGIN) {
            await delay(DELAY)
            // LoginPhase
            // Check if not already logged in
            // '#titleLogin>label' exists && '#titleLogin>label'.textContent == "כניסה למערכת"
    
            const login_title_selector = '#titleLogin>label'
            // Reached login successfully
            await page.waitForSelector(login_title_selector);
            await delay(DELAY)
            if (await page.$(login_title_selector) !== null) {
                await delay(DELAY)
                const title = await page.$("#titleLogin>label")
                await delay(DELAY)
                const title_text = await (await title.getProperty('textContent')).jsonValue()
                await delay(DELAY)
                console.log("title:"+title_text);
                if (title_text=="כניסה למערכת") {
                    console.log("Login is possible")
                    const company_select = 'input[id^="indexNumInput"]'
                    const user_selector = 'input[id^="useridInput"]'
                    const password_selector = 'input[id^="it2"]'
                    const login_button_selector = 'a#loginButton'
    
                    const hours_form_button_selector = 'tr[id^="pt1:timesheet"]>td:nth-child(2)'
    
    
                    await page.waitForSelector(company_select);
                    await page.waitForSelector(user_selector);
                    await page.waitForSelector(password_selector);
                    //login form DOM id:
                    //input[id^="indexNumInput"]
                    //input[id^="useridInput"]
                    //input[id^="it2"]')
                    await delay(DELAY)
                    await page.type(company_select,COMPANY)
                    await delay(DELAY)
                    await page.type(user_selector,USER)
                    await delay(DELAY)
                    await page.type(password_selector,PASSWORD)
                    await delay(DELAY)
                    // Login button id = #loginButton
                    await page.waitForSelector(login_button_selector);
                    await page.click(login_button_selector);
                    await delay(2000)
    
                    //Login completed
                    //Click on hours form button
                    const hours_page = await page.waitForSelector(hours_form_button_selector);
                    await hours_page.evaluate(b => b.click());
                    //await page.click(hours_form_button_selector);
    
    
                }
                else {
                    console.log("bad login page")
                    process.exit(1);
                }
    
            }
            else {
                console.log("login page not found")
                process.exit(1);
            }
            
            await delay(2000)
        }

        // Fill a column in form
        // select - DOM selector for the column, should return array of input DOMs
        // fill_value - Text value to fill in the input
        // approve_button - Optional, boolean, determine if input requires approve button for each iteration
        // updated_dealy - Optional, override base delay parameter for this function
        async function fill_form_column(selector,fill_value,approve_button=null,updated_delay=DELAY) {
            // Loop through column 'START' inputs DOMs
            await page.waitForSelector(selector);
            const start_input_array = await page.$$(selector);
            //console.log(start_input_array);

            for (const input of start_input_array){
                await input.focus();
                await delay(updated_delay);
                await input.type(fill_value);
                await delay(updated_delay);

                const inputId = await (await input.getProperty('id')).jsonValue();
                console.log(inputId);
                const rownum = inputId.split(":")[2];
                console.log(rownum);
                await delay(updated_delay)

                //g = input.getProperties();
                //console.log(g);
                //const rownum = input.handle.#remoteObject.description.split(":")[2];
                //rownum = 1;
                if (approve_button) {
                    const approve_button_selector = 'button[id^="pt1:dataTable:'+rownum+':"][id*="remarksDialog::ok"]:not(.p_AFDisabled)'
                    console.log(approve_button_selector)
                    if (approve_button_selector) {
                        const approve_button = await page.waitForSelector(approve_button_selector);
                        await approve_button.click();
                        //await approve_button.evaluate(b => b.click());
                        await delay(updated_delay);
                    }
                }
            }
       }

        // Loop through column 'START' inputs DOMs, fill START_HOUR (e.g. "09:00")
       await fill_form_column('input[id^="pt1:dataTable:"][id*="clockInTime::content"]:not(.p_AFDisabled)',START_HOUR);
       // Loop through column 'END' inputs DOMs, fill END_HOUR (e.g. "18:00")
       await fill_form_column('input[id^="pt1:dataTable:"][id*="clockOutTime::content"]:not(.p_AFDisabled)',END_HOUR);
       // Loop through column 'COMMENT' inputs DOMs, fill COMMENT (e.g. "mytext in here")
       await fill_form_column('span[id^="pt1:dataTable:"][id*="remarkInput"]:not(.p_AFDisabled)',COMMENT,true,1000);
       
       if (SAVE) {
        await delay(DELAY);
        await page.click('[id^="pt1:saveButton"]')
       }
        await delay(500);
        // Normally you want the browser to be closed afterwards
        if (AUTO_CLOSE) {
            await browser.close();
        }
        console.log("Payroll automotion DONE");
    }

    if (FIXED) {
        await malam_payroll_fixed();
    }
    else {
        var hours_file = await csv2json(CSV_FILE);
        console.log(hours_file);
        await malam_payroll_csv(hours_file);
    }
};


main();
