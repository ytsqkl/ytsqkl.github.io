<%@ WebHandler Language="C#" Class="Question"  %>

using System;
using System.Web;
using System.Data;
using System.Data.SqlClient;
using System.Collections.Generic;
public class Question : IHttpHandler
{

    SqlConnection mycon = new SqlConnection(System.Web.Configuration.WebConfigurationManager.ConnectionStrings["mycon"].ConnectionString);

    public void ProcessRequest(HttpContext context)
    {
        context.Response.ContentType = "text/plain";
        if (context.Request.Form.Count == 0)
        {
            context.Response.Write("null");
            return;
        }
        var ids = GetList();
        var qsstring = context.Request.Form[0].Split(new string[] { "~" }, StringSplitOptions.RemoveEmptyEntries);
        int count = 0;
        for (int i = 0; i < qsstring.Length; i += 2)
        {
            var id = Convert.ToInt32(qsstring[i]);
            if (ids.Contains(id))
                continue;
            var title = qsstring[i + 1];
            insert(id, title);
            count++;
        }
        context.Response.ContentType = "text/plain";
        context.Response.Write(count);
    }
    void insert(int id, string title)
    {
        if (mycon.State != ConnectionState.Open)
            mycon.Open();
        SqlCommand mycom = new SqlCommand("insert into question values(" + id + ",'" + title + "')", mycon);
        mycom.ExecuteNonQuery();

        if (mycon.State != ConnectionState.Closed)
            mycon.Close();
    }
    List<int> GetList()
    {
        List<int> ids = new List<int>();
        if (mycon.State != ConnectionState.Open)
            mycon.Open();
        SqlCommand mycom = new SqlCommand("select id from question", mycon);

        var reader = mycom.ExecuteReader();
        while (reader.Read())
        {
            ids.Add(Convert.ToInt32(reader[0]));
        }
        reader.Close();
        if (mycon.State != ConnectionState.Closed)
            mycon.Close();
        return ids;
    }
    public bool IsReusable
    {
        get
        {
            return false;
        }
    }

}