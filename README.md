# Payroll automation 
1. Clone repo
2. Install dependencies

   `npm install`
4. Edit config.json to your credentials
5. For CSV mode:
- set FIXED=False
- edit 'hours.csv' to your hours

For FIXED mode:
- set FIXED=True

6. Run code
 `node puppeteer.js`


## Parameters: 
Edit 'config.json' for parameters.  \
First ones to configure are: USERNAME,PASSWORD,FIXED,MONTH_GAP  


## All Paramters:  
HEADLESS -  Show automation browser \
USER - put your payroll username \
PASSWORD - put your payroll password \
FIXED -     True -> Put fixed hours.  \
&nbsp;&nbsp;False -> Put hours from CSV file. \
MONTH_GAP - Which month to fill up. \
&nbsp;&nbsp;0 - This month \
&nbsp;&nbsp;1 - one month ago \
&nbsp;&nbsp;X - X months ago \
START_HOUR - Starting hour for FIXED mode \
END_HOUR - Ending hour for FIXED mode \
COMMENT - The comment that will be written in each row. comments are mandatory to fill form.\
AUTO_CLOSE - Automatically close browser after filling up hours. Recommended to keep 'False' as human review is advised after automation is done.\
SAVE - Automatically click 'save' button after filling up hours. Recommended to keep 'False' as human review is advised after automation is done.

 
