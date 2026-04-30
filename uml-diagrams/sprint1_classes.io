<mxfile host="app.diagrams.net" agent="Mozilla/5.0">
  <diagram name="Sprint1_Classes" id="Sprint1_Classes">
    <mxGraphModel dx="1681" dy="703" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1700" pageHeight="850" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="pkg0" parent="1" style="shape=folder;fontStyle=1;tabWidth=160;tabHeight=24;tabPosition=left;html=1;fillColor=none;strokeColor=#999999;fontSize=12;align=left;verticalAlign=top;spacingLeft=10;spacingTop=4;dashed=1;dashPattern=8 4;" value="&lt;&lt;SPA&gt;&gt;  React (frontend)" vertex="1">
          <mxGeometry height="240" width="340" x="40" y="60" as="geometry" />
        </mxCell>
        <mxCell id="pkg1" parent="1" style="shape=folder;fontStyle=1;tabWidth=160;tabHeight=24;tabPosition=left;html=1;fillColor=none;strokeColor=#999999;fontSize=12;align=left;verticalAlign=top;spacingLeft=10;spacingTop=4;dashed=1;dashPattern=8 4;" value="&lt;&lt;API REST&gt;&gt;  Django + MongoDB (backend)" vertex="1">
          <mxGeometry height="720" width="940" x="400" y="60" as="geometry" />
        </mxCell>
        <mxCell id="Visiteur" parent="1" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=none;horizontal=1;startSize=30;rounded=0;shadow=0;strokeColor=#666666;fillColor=#f5f5f5;fontSize=13;swimlaneFillColor=#FFFFFF;" value="Visiteur" vertex="1">
          <mxGeometry height="176" width="280" x="80" y="100" as="geometry" />
        </mxCell>
        <mxCell id="Visiteur_attrs" parent="Visiteur" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="- email: str&#xa;- mot_de_passe: str&#xa;- code_verification: str&#xa;- statut_email: bool" vertex="1">
          <mxGeometry height="82" width="280" y="30" as="geometry" />
        </mxCell>
        <mxCell id="Visiteur_sep" parent="Visiteur" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#666666;strokeColor=none;" value="" vertex="1">
          <mxGeometry height="1" width="280" y="112" as="geometry" />
        </mxCell>
        <mxCell id="Visiteur_methods" parent="Visiteur" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ envoyerCodeVerification(): bool&#xa;+ verifierCode(code: str): bool&#xa;+ sInscrire(): Utilisateur" vertex="1">
          <mxGeometry height="63" width="280" y="113" as="geometry" />
        </mxCell>
        <mxCell id="Utilisateur" parent="1" style="swimlane;fontStyle=3;align=center;verticalAlign=top;childLayout=none;horizontal=1;startSize=30;rounded=0;shadow=0;strokeColor=#6c8ebf;fillColor=#dae8fc;fontSize=13;swimlaneFillColor=#FFFFFF;" value="Utilisateur" vertex="1">
          <mxGeometry height="302" width="280" x="720" y="100" as="geometry" />
        </mxCell>
        <mxCell id="Utilisateur_attrs" parent="Utilisateur" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ _id: ObjectId&#xa;+ nom: str&#xa;+ prenom: str&#xa;+ email: str&#xa;- mot_de_passe_hash: str&#xa;+ photo: str&#xa;+ role: enum [medecin, admin, adminIT]&#xa;+ statut_compte: enum [en_attente, accepte, refuse]&#xa;+ date_inscription: datetime&#xa;- token_jwt: str" vertex="1">
          <mxGeometry height="190" width="280" y="30" as="geometry" />
        </mxCell>
        <mxCell id="Utilisateur_sep" parent="Utilisateur" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#6c8ebf;strokeColor=none;" value="" vertex="1">
          <mxGeometry height="1" width="280" y="220" as="geometry" />
        </mxCell>
        <mxCell id="Utilisateur_methods" parent="Utilisateur" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ sAuthentifier(email, mdp): str&#xa;+ seDeconnecter(): void&#xa;+ modifierProfil(): bool&#xa;+ reinitialiserMotDePasse(): bool" vertex="1">
          <mxGeometry height="81" width="280" y="221" as="geometry" />
        </mxCell>
        <mxCell id="Notification" parent="1" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=none;horizontal=1;startSize=30;rounded=0;shadow=0;strokeColor=#d79b00;fillColor=#ffe6cc;fontSize=13;swimlaneFillColor=#FFFFFF;" value="Notification" vertex="1">
          <mxGeometry height="194" width="280" x="1040" y="100" as="geometry" />
        </mxCell>
        <mxCell id="Notification_attrs" parent="Notification" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ _id: ObjectId&#xa;+ destinataire_id: ObjectId&#xa;+ message: str&#xa;+ type: enum [inscription, validation, refus, reclamation]&#xa;+ lu: bool&#xa;+ date: datetime" vertex="1">
          <mxGeometry height="118" width="280" y="30" as="geometry" />
        </mxCell>
        <mxCell id="Notification_sep" parent="Notification" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#d79b00;strokeColor=none;" value="" vertex="1">
          <mxGeometry height="1" width="280" y="148" as="geometry" />
        </mxCell>
        <mxCell id="Notification_methods" parent="Notification" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ envoyer(): bool&#xa;+ marquerCommeLue(): void" vertex="1">
          <mxGeometry height="45" width="280" y="149" as="geometry" />
        </mxCell>
        <mxCell id="TokenReinitialisation" parent="1" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=none;horizontal=1;startSize=30;rounded=0;shadow=0;strokeColor=#d79b00;fillColor=#ffe6cc;fontSize=13;swimlaneFillColor=#FFFFFF;" value="TokenReinitialisation" vertex="1">
          <mxGeometry height="158" width="280" x="1030" y="320" as="geometry" />
        </mxCell>
        <mxCell id="TokenReinitialisation_attrs" parent="TokenReinitialisation" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ token: str&#xa;+ utilisateur_id: ObjectId&#xa;+ expire_le: datetime&#xa;+ utilise: bool" vertex="1">
          <mxGeometry height="82" width="280" y="30" as="geometry" />
        </mxCell>
        <mxCell id="TokenReinitialisation_sep" parent="TokenReinitialisation" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#d79b00;strokeColor=none;" value="" vertex="1">
          <mxGeometry height="1" width="280" y="112" as="geometry" />
        </mxCell>
        <mxCell id="TokenReinitialisation_methods" parent="TokenReinitialisation" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ verifierValidite(): bool&#xa;+ marquerUtilise(): void" vertex="1">
          <mxGeometry height="45" width="280" y="113" as="geometry" />
        </mxCell>
        <mxCell id="Medecin" parent="1" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=none;horizontal=1;startSize=30;rounded=0;shadow=0;strokeColor=#6c8ebf;fillColor=#dae8fc;fontSize=13;swimlaneFillColor=#FFFFFF;" value="Medecin" vertex="1">
          <mxGeometry height="122" width="280" x="400" y="580" as="geometry" />
        </mxCell>
        <mxCell id="Medecin_sep" parent="Medecin" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#6c8ebf;strokeColor=none;" value="" vertex="1">
          <mxGeometry height="1" width="280" y="58" as="geometry" />
        </mxCell>
        <mxCell id="Medecin_methods" parent="Medecin" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ creerRapport(): Rapport&#xa;+ consulterHistorique(): List[Rapport]&#xa;+ soumettreReclamation(): Reclamation" vertex="1">
          <mxGeometry height="63" width="280" y="59" as="geometry" />
        </mxCell>
        <mxCell id="Administrateur" parent="1" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=none;horizontal=1;startSize=30;rounded=0;shadow=0;strokeColor=#6c8ebf;fillColor=#dae8fc;fontSize=13;swimlaneFillColor=#FFFFFF;" value="Administrateur" vertex="1">
          <mxGeometry height="140" width="280" x="760" y="580" as="geometry" />
        </mxCell>
        <mxCell id="Administrateur_sep" parent="Administrateur" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#6c8ebf;strokeColor=none;" value="" vertex="1">
          <mxGeometry height="1" width="280" y="58" as="geometry" />
        </mxCell>
        <mxCell id="Administrateur_methods" parent="Administrateur" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ validerCompte(id, statut): bool&lt;div&gt;+ refuserMedecin(id,statut): bool&lt;br&gt;+ supprimerMedecin(id): bool&lt;br&gt;+ promouvoirEnAdmin(id): bool&lt;br&gt;+ exporterRapports(): ExportCSV&lt;/div&gt;" vertex="1">
          <mxGeometry height="81" width="280" y="59" as="geometry" />
        </mxCell>
        <mxCell id="AdministrateurIT" parent="1" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=none;horizontal=1;startSize=30;rounded=0;shadow=0;strokeColor=#6c8ebf;fillColor=#dae8fc;fontSize=13;swimlaneFillColor=#FFFFFF;" value="AdministrateurIT" vertex="1">
          <mxGeometry height="158" width="280" x="1060" y="580" as="geometry" />
        </mxCell>
        <mxCell id="AdministrateurIT_sep" parent="AdministrateurIT" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#6c8ebf;strokeColor=none;" value="" vertex="1">
          <mxGeometry height="1" width="280" y="58" as="geometry" />
        </mxCell>
        <mxCell id="AdministrateurIT_methods" parent="AdministrateurIT" style="text;align=left;verticalAlign=top;fillColor=none;strokeColor=none;spacingLeft=8;spacingTop=4;spacingRight=4;fontSize=11;whiteSpace=wrap;html=1;" value="+ supprimerAdmin(id): bool&#xa;+ retrograderAdmin(id): bool&#xa;+ traiterReclamation(id, statut): bool&#xa;+ uploaderModele(fichier): ModeleIA&#xa;+ activerModele(id): bool" vertex="1">
          <mxGeometry height="99" width="280" y="59" as="geometry" />
        </mxCell>
        <mxCell id="e0" edge="1" parent="1" source="Medecin" style="endArrow=block;endFill=0;endSize=16;html=1;rounded=0;edgeStyle=orthogonalEdgeStyle;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;" target="Utilisateur">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2" edge="1" parent="1" source="AdministrateurIT" style="endArrow=block;endFill=0;endSize=16;html=1;rounded=0;edgeStyle=orthogonalEdgeStyle;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;" target="Utilisateur">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3" edge="1" parent="1" source="Utilisateur" style="endArrow=none;startArrow=diamondThin;startFill=1;startSize=14;html=1;rounded=0;edgeStyle=orthogonalEdgeStyle;" target="Notification">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3_ls" connectable="0" parent="e3" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;labelBackgroundColor=#ffffff;fontSize=10;" value="1" vertex="1">
          <mxGeometry relative="1" x="-0.7" as="geometry">
            <mxPoint as="offset" />
          </mxGeometry>
        </mxCell>
        <mxCell id="e3_lt" connectable="0" parent="e3" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;labelBackgroundColor=#ffffff;fontSize=10;" value="0..*" vertex="1">
          <mxGeometry relative="1" x="0.7" as="geometry">
            <mxPoint as="offset" />
          </mxGeometry>
        </mxCell>
        <mxCell id="e3_lm" connectable="0" parent="e3" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;labelBackgroundColor=#ffffff;fontSize=10;fontStyle=2;" value="destinataire" vertex="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint as="offset" />
          </mxGeometry>
        </mxCell>
        <mxCell id="e4" edge="1" parent="1" source="Utilisateur" style="endArrow=open;endFill=0;dashed=1;html=1;rounded=0;edgeStyle=orthogonalEdgeStyle;" target="TokenReinitialisation">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4_ls" connectable="0" parent="e4" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;labelBackgroundColor=#ffffff;fontSize=10;" value="1" vertex="1">
          <mxGeometry relative="1" x="-0.7" as="geometry">
            <mxPoint as="offset" />
          </mxGeometry>
        </mxCell>
        <mxCell id="e4_lt" connectable="0" parent="e4" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;labelBackgroundColor=#ffffff;fontSize=10;" value="0..1" vertex="1">
          <mxGeometry relative="1" x="0.7" as="geometry">
            <mxPoint as="offset" />
          </mxGeometry>
        </mxCell>
        <mxCell id="e1" edge="1" parent="1" source="Administrateur_methods" style="endArrow=block;endFill=0;endSize=16;html=1;rounded=0;edgeStyle=orthogonalEdgeStyle;fontStyle=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;" target="Medecin_methods">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="900" y="730" />
              <mxPoint x="530" y="730" />
            </Array>
            <mxPoint x="710.0666666666666" y="840" as="sourcePoint" />
            <mxPoint x="520" y="699" as="targetPoint" />
          </mxGeometry>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
