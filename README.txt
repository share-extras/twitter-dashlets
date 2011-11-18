Twitter dashlets for Alfresco Share
===================================

Author: Will Abson

This project provides three dashlets for interacting with Twitter via 
Alfresco Share.

The Twitter Feed dashlet displays recent Tweets belonging to any Twitter 
user, or from any list belonging to a user, within the dashlet.

The Twitter Search dashlet performs a search for a specific term or hashtag
and displays Tweets matching that term in the dashlet.

The Twitter Timeline dashlet allows the user to connect the dashlet to their
Twitter account and view their own personal timeline.

Installation
------------

The dashlets have been developed to install on top of an existing Alfresco
3.3 or 3.4 installation.

An Ant build script is provided to build a JAR file containing the 
custom files, which can then be installed into the 'tomcat/shared/lib' folder 
of your Alfresco installation.

To build the JAR file, run the following command from the base project 
directory.

    ant clean dist-jar

The command should build a JAR file named twitter-dashlets.jar
in the 'dist' directory within your project.

To deploy the dashlet files into a local Tomcat instance for testing, you can 
use the hotcopy-tomcat-jar task. You will need to set the tomcat.home
property in Ant.

    ant -Dtomcat.home=C:/Alfresco/tomcat clean hotcopy-tomcat-jar
    
Once you have run this you will need to restart Tomcat so that the classpath 
resources in the JAR file are picked up.

Using the dashlet
-----------------

Log in to Alfresco Share and navigate to a site dashboard. Click the 
Customize Dashboard button to edit the contents of the dashboard and drag 
one of the dashlets into one of the columns.

Credits
-------

Connect and disconnect icons from LED icon pack by LED 24 - http://findicons.com/icon/178350/connect