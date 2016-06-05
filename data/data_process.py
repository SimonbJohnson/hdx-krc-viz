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
    checkAggLimits(data,aggList)
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

def checkAggLimits(data,aggList):
    output = genAggObj(data,aggList,{})
    aggIDList = []
    for agg in aggList:
        aggIDList.append(findCol(agg,data))
    for d in data[1:]:
        ref = output
        for a in aggIDList[:-1]:
                ref = ref[d[a]]
        ref[d[aggIDList[len(aggIDList)-1]]]+=1
    print output

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
#krc
questions = ["What is the main source of drinking water for members of your household?","Main Occupation of the Household Head _ HH","What is your main current source of income","Where do you store water for drinking?","What do you usually do to make the water safer to drink?","What is the trekking distance to the current main water source?","Who usually goes to this source to fetch water","What is the main reason you are not satisfied with the water supply?","Information on the importance of hand washing with soap has never been given to you","What is your main mode of human waste disposal?","Does your toilet have hand washing facilities? (Sink, running tap, water bucket, etc.)","Most people you know only wash their hands with soap after going to the toilet","The last time [NAME OF YOUNGEST CHILD] passed stools, what was done to dispose of the stools?","How many mosquito nets does this household have?  ____________________","In the last month, have you or anyone in your household borrowed cash, food or other items with or without interest?","In the last month, have you or anyone in your household borrowed cash, food or other items with or without interest?","In the last one month, have you or anyone in your household gone to bed without food due to lack of it?","What is the average size of land you own?","In the past 7 DAYS, have there been times when you did not have enough food or money to buy food?"]
aggregatorList = ["Ward"]
headers = ['Question','Location','Answer','Count'];
with open('BIDP-Final_Data3.csv', 'rb') as csvfile:

#nepal
#questions =['What is your biggest problem?','Are you satisfied with what NGOs are doing for you after the earthquake?','Are your main problems being addressed?','What is the top thing that you need information about?','Is support provided in a fair way?','Do_you_have_any_health_problem','Occupation']
#aggregatorList = ['District','Round']
#headers = ['Question','Location','Round','Answer','Count']
#with open('nepal.csv', 'rU') as csvfile:

#jordan
#questions =['Q201. What is the highest degree or level of school you have completed?','Q301: If there was a medical need, were you or any of children under 18 able to access public hospitals/clinics in the last six months?']
#aggregatorList = ['[R6]  Governate','[Q101]  Q101. Gender of respondent']
#headers = ['Question','Location','Sex','Answer','Count']
#with open('unicef_jordan.csv', 'rb') as csvfile:

#Tanzania
#questions = ["hh_size","hh_children","asset_elec","asset_water","income_source"]
#aggregatorList = ["wardcode"]
#headers = ['Question','Location','Answer','Count'];
#with open('TZ15_hhld.csv', 'rb') as csvfile:

    contents = list(list(rec) for rec in csv.reader(csvfile, delimiter=','))

data = aggQuestions(questions,aggregatorList,contents)
output = flattenOutput(data,[],[])
with open('resultskrc.csv',"w") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(headers)
    writer.writerows(output)
