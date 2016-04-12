import csv
import copy

def findCol(question,contents):
    return contents[0].index(question)

def findDistinctValues(agg,data):
    col = findCol(agg,data)
    output = []
    for d in data[1:]:
        if d[col] not in output:
            output.append(d[col])
    return output
        
def genAggObj(data,aggList,tree):
    agg = aggList[0]
    disValues = findDistinctValues(agg,data)
    if len(aggList)>1:
        tree = genAggObj(data,aggList[1:],tree)
    else:
        tree = 0
    output = {}
    for d in disValues:
        output[d] = copy.deepcopy(tree)
    return output

def aggQuestions(qList,aggList,data):
    output = {}
    aggIDList = []
    for agg in aggList:
        aggIDList.append(findCol(agg,data))
    print aggIDList
    for q in qList:
        output[q] = genAggObj(data,aggList+[q],{})
        qID = findCol(q,data)
        for d in data[1:]:
            ref = output[q]
            for a in aggIDList:
                ref = ref[d[a]]              
            ref[d[qID]]+=1

    return output

def flattenOutput(data,output,line):
    for key in data:
        if type(data[key]) is dict:
            flattenOutput(data[key],output,line+[key])
        else:
            lineLast = copy.copy(line)
            lineLast.append(key)
            lineLast.append(data[key])
            output.append(lineLast)
    return output
            
            
    
print "Start"
questions = ["What is the main source of drinking water for members of your household?","Main Occupation of the Household Head _ HH","Where do you store water for drinking?","What do you usually do to make the water safer to drink?"]
aggregatorList = ["Sub-Location"]
headers = ['Question','Location','Answer','Count'];


with open('BIDP-Final_Data3.csv', 'rb') as csvfile:
    contents = list(list(rec) for rec in csv.reader(csvfile, delimiter=','))

data = aggQuestions(questions,aggregatorList,contents)
output = flattenOutput(data,[],[])
with open('results.csv',"w") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(headers)
    writer.writerows(output)
