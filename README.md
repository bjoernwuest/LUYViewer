![LUY Viewer logo](LUYViewer_logo.png)

Permits LUY users to download data and view it offline / without LUY.


## Installation

1) Go to the [releases](https://github.com/bjoernwuest/LUYViewer/releases) and download the package appropriate for your environment.
2) Unpack the downloaded package.
3) Edit "config.json" file, particularly give other port number (default: 8080) and the URL to your "luy_host".
4) Run the LUYViewer application (on Windows, this is LUYViewer.exe)
5) Open the browser, usually the address is "http://localhost:<your port number configured in step #3>'


## Uninstallation

Delete the unpacked package.


## Usage

This section describes step-by-step how to use the LUYViewer application. It is split into the sections "Before first use", "Daily Use", and "Cleanup".

### Some words of warning before use

* The LUYViewer is just a viewer for LUY data. It never manipulates any data in LUY.
* The LUYViewer stores the data viewed locally in the sub-folder "data". The data is not encrypted or otherwise protected. So it is up to you to ensure that the data is not accessible to someone else.
* The LUYViewer expects local, single-user usage. Thus, there is no login, authentication, or other mean of security!
* As I expect that most people use the LUYViewer in business context, your IT department may have locked down your working environment in a way that execution is not permitted. In Windows, this usually involves the Windows Privacy Shield and Windows Firewall Configuration. If unsure, feel free to ask your IT department to check this [Github repository](https://github.com/bjoernwuest/LUYViewer) for any helpful information and at last resort, reach out to me. 

### Before first use

While very simply, the application requires basic configuration before use. The whole configuration is held in a file called "config.json". It follows the [JSON specification](https://www.json.org/). The following configuration options are available:

| Configuration | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Example |
|--|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--|
| luy-host | The URL of the LUY. If it is LUY in the cloud, this usually looks like https://your_name.luy.app . If you operate LUY on premises, this may look different. Important is that you start with http:// or https:// - whatever is applicable in your setup.<br>Furthermore, make sure that you do not end the URL with a slash. If your LUY uses a different port than the standard web port (80 or 443), you may specify the port at the end in the format :Port . | https://demo.luy.app<br>https://my.luy.biz:8123
| language | Here you define the language the LUYViewer shall be (not the data displayed!). It is a two letter code. As of July 4th 2025, only de for German and en for English are supported. | en |
| server . port | This is the port number that the application uses locally. As the application is actually running in your browser, it needs a server part, where this configuration specifies the port to run on. The default is 28123 and in most cases it is not necessary to change it. Yet, when you see error messages during start of application, it may be necessary to change this number. Valid numbers are in the range from 1 to 65535, while it is good practice to use a value between 1024 and 65535 . | 28123 |
| server . host | This is the IP address that the server part of the application expects to be called at. Leave this to be "localhost". Change it only when you know what you are doing. | localhost |

Finally, check if the *data* folder exists, and if not, create it.

### Daily use

To use the application, simply start it. If started, it shows something like this (Windows, the error message is Windows specific and can be ignored):
![Windows startup screen](./doc/windows_commandline.png)

Open the URL displayed (in above example: http://localhost:28123) in the browser. The following screen shall show:

![Start screen of application](./doc/Start_Screen.png)

If this is the first time you use the application, most likely you want to press the "Download" button and download a data set from LUY. Enter the user name and password of the (iTurm!) user that has permission to read the LUY data.

![Download dialog](./doc/Download_Dialog.png)

After download is finished, you are returned to the start screen and can select the data set:

![Select data set](./doc/Select_dataset.png)

The available data sets are shown by their timestamp they were downloaded from LUY. After selecting a data set, you are queried to select the building block type to view:

![Select building block type](./doc/Select_Buildingblocktype.png)

For the selected building block type, an overview table with all data of all building blocks of that type are shown:

![Building block type overview table](./doc/BBT_Table.png)

When you click any column, you can sort the table:

![Sorted table](./doc/Table_Sorting.png)

You can also click the small button right beneath the text to filter the table. The filter works quite similar to the one found in MS Excel:

![Table filter](./doc/Table_Filter.png)

Finally, you can click on the *id* of a building block to view it in a details page:

![Building block detail view](./doc/BB_Detail.png)

Whatever you do, keep in mind that using the LUYViewer you do not modify data in LUY.


### Cleanup

The LUYViewer keeps snapshots of the LUY data in the local data folder. Depending on the size of your model, this can be a few megabytes per file. While today this may not harm your disk, it has two impacts:

1. The selection list for the data set to view may become very long if you have a lot of snapshots. While this is not a performance impact, it makes it more difficult to select the proper data set.
1. Any data on your local device may be a potential risk, e.g. if you loose the device. Thus, have only as less data as necessary is a good security practice.

How to cleanup? Simple. LUYViewer stores two files for each snapshot of LUY data: the metamodel and the actual data. Each snapshot is preceeed by the timestamp when the snapshot was taken in the format of YearMonthDay_HourMinuteSecond_, and then followed by metamodel for the LUY metamodel, and data for the actual LUY Data. To delete a snapshot, simply delete both files with the same timestamp. That's it.

## Team and roles

| Member                                                              | Role      |
|---------------------------------------------------------------------|-----------|
| Anthropic's Claude Sonnet 4 | Developer |
| [Bjoern Wuest (bjoern@liwuest.net)](https://github.com/bjoernwuest) | Committer |
| [Bjoern Wuest (bjoern@liwuest.net)](https://github.com/bjoernwuest) | Reviewer  |
| [Bjoern Wuest (bjoern@liwuest.net)](https://github.com/bjoernwuest) | Approver  |
| [Bjoern Wuest (bjoern@liwuest.net)](https://github.com/bjoernwuest) | Tester    |


## Privacy, data security, and code signing policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

Data remains local with the LUYViewer, whereever it is run. The LUYViewer is just a reader, it does not modify any data in your LUY instance. All data stored with the LUYViewer, i.e. downloaded snapshots of your data in LUY, is **NOT** encrypted. It is up to you to keep your data with the required level of security and privacy.


## License

The LUYViewer is licensed under the [Apache2 license](LICENSE).


## Funny and motivational

The motivation of this application is the increasing effort of the LUY company to offer their product LUY as cloud-only SaaS solution. While comfortable and convenient, you are out of control of your data within LUY to some extent (in my opinion). This is critical especially since LUY is often used to document process and IT landscapes, and thus likely used in Business Continuity Management, Emergency Response Teams, etc.. My background as consultant for iteratec GmbH, the initial developer of LUY (formerly iteraplan) from 2011 to 2016/2019, gives me the necessary background in understanding how LUY is used, as well as what is required in an emergency case where LUY is unavailable - for a couple of hours or a few days.

This project has been entirely created using Artificial Intelligence (particularly Claude Sonnet 4). So, a big appreciation to Anthropic for their decent AI that made this small, nice application possible. The logo and icon have been created by ChatGPT 4. Testing was done manually by me, I am still looking for a good AI doing this...

The LUYViewer is written in TypeScript, JavaScript, HTML, and CSS, executed in Deno runtime and the browser. For convenience, there are release packages for different platforms so the LUYViewer can be run without the Deno runtime - because it is bundled into the executable of the LUYViewer. I selected the tech stack because whatever I do, I also do to learn. And this tech stack is a promising full-stack selection for web based applications. In particular, I consider Deno as a big leap for the JavaScript backend ecosystem, since it comes with built-in multi threading, native TypeScript support, and can be compiled to binaries making distribution more easy (i.e. does not require to setup e.g. Node.js runtime).


## Call for support

For Windows, it would help if the application is signed. Unfortunately, there are very few options for free-of-charge open source software, and those focus on more widespread software also discussed in mainstream media. Since the LUYViewer does not fit into this category, I would appreciate any support in getting the LUYViewer signed for Windows. If you want to support (e.g. because you have signing facility, or you are willing to pay for commercial signing), please reach out to me.
