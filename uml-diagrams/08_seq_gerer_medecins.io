<mxfile host="app.diagrams.net" agent="Mozilla/5.0">
  <diagram name="Gerer medecins" id="seq-gerer-medecins">
    <mxGraphModel dx="1600" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1400" pageHeight="1500" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="bg" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#e8f0fe;strokeColor=#b6c8e0;" vertex="1" parent="1">
          <mxGeometry x="20" y="20" width="1360" height="1420" as="geometry" />
        </mxCell>
        <mxCell id="title" value="Diagramme de Sequence — Gerer medecins (SPA + API REST)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=16;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="200" y="30" width="1000" height="30" as="geometry" />
        </mxCell>
        <mxCell id="a_admin" value="Admin" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="90" y="80" width="40" height="60" as="geometry" />
        </mxCell>
        <mxCell id="p_spa" value="SPA&#10;(React)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#6c8ebf;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="230" y="90" width="130" height="50" as="geometry" />
        </mxCell>
        <mxCell id="p_api" value="API REST&#10;(Django)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#6c8ebf;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="430" y="90" width="130" height="50" as="geometry" />
        </mxCell>
        <mxCell id="p_db" value="MongoDB" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#ffffff;strokeColor=#6c8ebf;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="640" y="80" width="80" height="60" as="geometry" />
        </mxCell>
        <mxCell id="p_mail" value="Service Email&#10;(SMTP)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#6c8ebf;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="800" y="90" width="130" height="50" as="geometry" />
        </mxCell>
        <mxCell id="a_med" value="Medecin" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1020" y="80" width="40" height="60" as="geometry" />
        </mxCell>
        <mxCell id="ll_admin" style="endArrow=none;html=1;dashed=1;strokeColor=#7f8c8d;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="110" y="160" as="sourcePoint" />
            <mxPoint x="110" y="1410" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="ll_spa" style="endArrow=none;html=1;dashed=1;strokeColor=#7f8c8d;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="295" y="160" as="sourcePoint" />
            <mxPoint x="295" y="1410" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="ll_api" style="endArrow=none;html=1;dashed=1;strokeColor=#7f8c8d;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="160" as="sourcePoint" />
            <mxPoint x="495" y="1410" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="ll_db" style="endArrow=none;html=1;dashed=1;strokeColor=#7f8c8d;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="680" y="160" as="sourcePoint" />
            <mxPoint x="680" y="1410" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="ll_mail" style="endArrow=none;html=1;dashed=1;strokeColor=#7f8c8d;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="865" y="160" as="sourcePoint" />
            <mxPoint x="865" y="1410" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="ll_med" style="endArrow=none;html=1;dashed=1;strokeColor=#7f8c8d;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="1040" y="160" as="sourcePoint" />
            <mxPoint x="1040" y="1410" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="sec1_line" style="endArrow=none;html=1;strokeColor=#000000;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="50" y="190" as="sourcePoint" />
            <mxPoint x="1350" y="190" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="sec1_label" value="1. Consulter la liste des medecins" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="540" y="175" width="320" height="30" as="geometry" />
        </mxCell>
        <mxCell id="m1" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="110" y="225" as="sourcePoint" />
            <mxPoint x="295" y="225" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m1l" value="1. Acceder a la page Medecins" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="120" y="207" width="170" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m2" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="295" y="260" as="sourcePoint" />
            <mxPoint x="495" y="260" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m2l" value="2. GET /api/auth/users" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="305" y="242" width="180" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m3" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="295" as="sourcePoint" />
            <mxPoint x="680" y="295" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m3l" value="3. Recherche utilisateurs" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="505" y="277" width="170" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m4" style="endArrow=open;html=1;dashed=1;rounded=0;endFill=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="680" y="330" as="sourcePoint" />
            <mxPoint x="495" y="330" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m4l" value="4. Liste des comptes" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="505" y="312" width="170" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m5" style="endArrow=open;html=1;dashed=1;rounded=0;endFill=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="365" as="sourcePoint" />
            <mxPoint x="295" y="365" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m5l" value="5. 200 OK + liste" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="305" y="347" width="180" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m6" style="endArrow=open;html=1;dashed=1;rounded=0;endFill=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="295" y="400" as="sourcePoint" />
            <mxPoint x="110" y="400" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m6l" value="6. Affiche la liste" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="115" y="382" width="180" height="18" as="geometry" />
        </mxCell>
        <mxCell id="sec2_line" style="endArrow=none;html=1;strokeColor=#000000;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="50" y="445" as="sourcePoint" />
            <mxPoint x="1350" y="445" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="sec2_label" value="2. Valider ou refuser une demande" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="540" y="430" width="320" height="30" as="geometry" />
        </mxCell>
        <mxCell id="m7" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="110" y="490" as="sourcePoint" />
            <mxPoint x="295" y="490" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m7l" value="7. Choisit un medecin (statut = pending)" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="120" y="472" width="200" height="18" as="geometry" />
        </mxCell>
        <mxCell id="alt_box" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#666666;dashed=0;" vertex="1" parent="1">
          <mxGeometry x="80" y="510" width="1280" height="430" as="geometry" />
        </mxCell>
        <mxCell id="alt_tag" value="alt" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="80" y="510" width="50" height="20" as="geometry" />
        </mxCell>
        <mxCell id="branchA_label" value="[Decision = Valider]" style="text;html=1;align=left;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="135" y="535" width="200" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m8a" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="110" y="570" as="sourcePoint" />
            <mxPoint x="295" y="570" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m8al" value="8a. Clique Valider" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="120" y="552" width="170" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m9a" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="295" y="605" as="sourcePoint" />
            <mxPoint x="495" y="605" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m9al" value="9a. PUT /users/{id}/status&#10;{status: validated}" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="305" y="580" width="180" height="28" as="geometry" />
        </mxCell>
        <mxCell id="m10a" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="640" as="sourcePoint" />
            <mxPoint x="680" y="640" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m10al" value="10a. Met a jour le statut" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="505" y="622" width="170" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m11a" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="675" as="sourcePoint" />
            <mxPoint x="865" y="675" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m11al" value="11a. Envoie email de validation" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="585" y="657" width="190" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m12a" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="865" y="710" as="sourcePoint" />
            <mxPoint x="1040" y="710" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m12al" value="12a. Email Compte valide" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="875" y="692" width="160" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m13a" style="endArrow=open;html=1;dashed=1;rounded=0;endFill=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="745" as="sourcePoint" />
            <mxPoint x="295" y="745" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m13al" value="13a. 200 OK" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="305" y="727" width="180" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m14a" style="endArrow=open;html=1;dashed=1;rounded=0;endFill=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="295" y="780" as="sourcePoint" />
            <mxPoint x="110" y="780" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m14al" value="14a. Compte valide" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="115" y="762" width="180" height="18" as="geometry" />
        </mxCell>
        <mxCell id="alt_sep" style="endArrow=none;html=1;dashed=1;strokeColor=#666666;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="80" y="805" as="sourcePoint" />
            <mxPoint x="1360" y="805" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="branchB_label" value="[Decision = Refuser]" style="text;html=1;align=left;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="135" y="815" width="200" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m8b" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="110" y="855" as="sourcePoint" />
            <mxPoint x="295" y="855" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m8bl" value="8b. Clique Refuser + saisit motif" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="120" y="837" width="200" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m9b" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="295" y="890" as="sourcePoint" />
            <mxPoint x="495" y="890" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m9bl" value="9b. PUT /users/{id}/status&#10;{status: refused, reason}" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="305" y="865" width="180" height="28" as="geometry" />
        </mxCell>
        <mxCell id="m10b" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="918" as="sourcePoint" />
            <mxPoint x="865" y="918" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m10bl" value="10b. Envoie email de refus + motif" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="585" y="900" width="200" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m11b" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="865" y="960" as="sourcePoint" />
            <mxPoint x="1040" y="960" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m11bl" value="11b. Email Demande refusee" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="875" y="942" width="170" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m12b" style="endArrow=open;html=1;dashed=1;rounded=0;endFill=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="990" as="sourcePoint" />
            <mxPoint x="110" y="990" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m12bl" value="12b. 200 OK / Compte refuse" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="200" y="972" width="200" height="18" as="geometry" />
        </mxCell>
        <mxCell id="sec3_line" style="endArrow=none;html=1;strokeColor=#000000;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="50" y="1030" as="sourcePoint" />
            <mxPoint x="1350" y="1030" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="sec3_label" value="3. Promouvoir un medecin en admin" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="540" y="1015" width="320" height="30" as="geometry" />
        </mxCell>
        <mxCell id="m15" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="110" y="1075" as="sourcePoint" />
            <mxPoint x="295" y="1075" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m15l" value="13. Clique Promouvoir" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="120" y="1057" width="170" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m16" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="295" y="1110" as="sourcePoint" />
            <mxPoint x="495" y="1110" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m16l" value="14. PUT /users/{id}/role&#10;{role: admin}" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="305" y="1085" width="180" height="28" as="geometry" />
        </mxCell>
        <mxCell id="m17" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="1145" as="sourcePoint" />
            <mxPoint x="680" y="1145" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m17l" value="15. Met a jour le role" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="505" y="1127" width="170" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m18" style="endArrow=open;html=1;dashed=1;rounded=0;endFill=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="1180" as="sourcePoint" />
            <mxPoint x="295" y="1180" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m18l" value="16. 200 OK" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="305" y="1162" width="180" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m19" style="endArrow=open;html=1;dashed=1;rounded=0;endFill=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="295" y="1215" as="sourcePoint" />
            <mxPoint x="110" y="1215" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m19l" value="17. Medecin promu en admin" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="115" y="1197" width="200" height="18" as="geometry" />
        </mxCell>
        <mxCell id="sec4_line" style="endArrow=none;html=1;strokeColor=#000000;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="50" y="1255" as="sourcePoint" />
            <mxPoint x="1350" y="1255" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="sec4_label" value="4. Supprimer un medecin" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="540" y="1240" width="320" height="30" as="geometry" />
        </mxCell>
        <mxCell id="m20" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="110" y="1300" as="sourcePoint" />
            <mxPoint x="295" y="1300" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m20l" value="18. Clique Supprimer + confirme" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="120" y="1282" width="200" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m21" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="295" y="1335" as="sourcePoint" />
            <mxPoint x="495" y="1335" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m21l" value="19. DELETE /api/auth/users/{id}" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="305" y="1317" width="200" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m22" style="endArrow=classic;html=1;rounded=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="1370" as="sourcePoint" />
            <mxPoint x="680" y="1370" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m22l" value="20. Supprime le document" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="505" y="1352" width="170" height="18" as="geometry" />
        </mxCell>
        <mxCell id="m23" style="endArrow=open;html=1;dashed=1;rounded=0;endFill=0;fontSize=11;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="495" y="1400" as="sourcePoint" />
            <mxPoint x="110" y="1400" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="m23l" value="21. 200 OK / Medecin supprime" style="text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="200" y="1382" width="220" height="18" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
