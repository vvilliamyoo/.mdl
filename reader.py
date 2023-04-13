import csv

websites = []

with open('websites.csv') as csv_file:
    csv_reader = csv.reader(csv_file)
    for row in csv_reader:
        websites.append(row[0])
with open('index.html', 'w') as html_file:
    for website in websites:
        html_file.write('<a href="{}">{}</a><br>\n'.format(website, website))
