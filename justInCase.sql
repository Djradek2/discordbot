PGDMP                      }           testdb     17.4 (Ubuntu 17.4-1.pgdg24.04+2)    17.2     f           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false            g           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false            h           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false            i           1262    16406    testdb    DATABASE     n   CREATE DATABASE testdb WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'C.UTF-8';
    DROP DATABASE testdb;
                     josh    false                        2615    16407 
   discordbot    SCHEMA        CREATE SCHEMA discordbot;
    DROP SCHEMA discordbot;
                     josh    false            �            1259    16431    approximateQuestions    TABLE       CREATE TABLE discordbot."approximateQuestions" (
    id bigint NOT NULL,
    set_id bigint NOT NULL,
    question_text character varying NOT NULL,
    correct real NOT NULL,
    status bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 .   DROP TABLE discordbot."approximateQuestions";
    
   discordbot         heap r       josh    false    6            �            1259    16430    approximateQuestions_id_seq    SEQUENCE     �   ALTER TABLE discordbot."approximateQuestions" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME discordbot."approximateQuestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
         
   discordbot               josh    false    222    6            �            1259    16416    exactQuestions    TABLE     �  CREATE TABLE discordbot."exactQuestions" (
    id bigint NOT NULL,
    set_id bigint NOT NULL,
    question_text character varying NOT NULL,
    correct character varying NOT NULL,
    option1 character varying NOT NULL,
    option2 character varying NOT NULL,
    option3 character varying NOT NULL,
    status bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 (   DROP TABLE discordbot."exactQuestions";
    
   discordbot         heap r       josh    false    6            �            1259    16428    exactQuestions_id_seq    SEQUENCE     �   ALTER TABLE discordbot."exactQuestions" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME discordbot."exactQuestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
         
   discordbot               josh    false    219    6            �            1259    16408    questionSets    TABLE     �   CREATE TABLE discordbot."questionSets" (
    id bigint NOT NULL,
    title character varying NOT NULL,
    status bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 &   DROP TABLE discordbot."questionSets";
    
   discordbot         heap r       josh    false    6            c          0    16431    approximateQuestions 
   TABLE DATA           l   COPY discordbot."approximateQuestions" (id, set_id, question_text, correct, status, created_at) FROM stdin;
 
   discordbot               josh    false    222   �       `          0    16416    exactQuestions 
   TABLE DATA           �   COPY discordbot."exactQuestions" (id, set_id, question_text, correct, option1, option2, option3, status, created_at) FROM stdin;
 
   discordbot               josh    false    219   +       _          0    16408    questionSets 
   TABLE DATA           K   COPY discordbot."questionSets" (id, title, status, created_at) FROM stdin;
 
   discordbot               josh    false    218   v,       j           0    0    approximateQuestions_id_seq    SEQUENCE SET     P   SELECT pg_catalog.setval('discordbot."approximateQuestions_id_seq"', 48, true);
       
   discordbot               josh    false    221            k           0    0    exactQuestions_id_seq    SEQUENCE SET     J   SELECT pg_catalog.setval('discordbot."exactQuestions_id_seq"', 72, true);
       
   discordbot               josh    false    220            �           2606    16437 .   approximateQuestions approximateQuestions_pkey 
   CONSTRAINT     t   ALTER TABLE ONLY discordbot."approximateQuestions"
    ADD CONSTRAINT "approximateQuestions_pkey" PRIMARY KEY (id);
 `   ALTER TABLE ONLY discordbot."approximateQuestions" DROP CONSTRAINT "approximateQuestions_pkey";
    
   discordbot                 josh    false    222            �           2606    16422 "   exactQuestions exactQuestions_pkey 
   CONSTRAINT     h   ALTER TABLE ONLY discordbot."exactQuestions"
    ADD CONSTRAINT "exactQuestions_pkey" PRIMARY KEY (id);
 T   ALTER TABLE ONLY discordbot."exactQuestions" DROP CONSTRAINT "exactQuestions_pkey";
    
   discordbot                 josh    false    219            �           2606    16414    questionSets questionSets_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY discordbot."questionSets"
    ADD CONSTRAINT "questionSets_pkey" PRIMARY KEY (id);
 P   ALTER TABLE ONLY discordbot."questionSets" DROP CONSTRAINT "questionSets_pkey";
    
   discordbot                 josh    false    218            �           2606    16423    exactQuestions which_set    FK CONSTRAINT     �   ALTER TABLE ONLY discordbot."exactQuestions"
    ADD CONSTRAINT which_set FOREIGN KEY (set_id) REFERENCES discordbot."questionSets"(id);
 H   ALTER TABLE ONLY discordbot."exactQuestions" DROP CONSTRAINT which_set;
    
   discordbot               josh    false    218    3272    219            c   }  x��W�n�F]�_1]�Fm�o=6B��yI����"�9�03C�̪��B7��|Iϐ�C�v)�QY��s�=�ȟ��ۜI���؜�7J��wUPIn��kF��t-��Y���=O^_y�U�?YF�ҏ��8���/�w� �5ӂKrK��$���91���Z��j,�2#���}��l���rjIͨ^M��|1�2l��!Ϛ^>K�R}��hH�RA��+^d��F��\kn)��5�%�\�e�L�Y��\�d���r���+r�%���GfK�[��4���1���7jG rMJAk�q�)�Խ�Q7J�F,��ÄBfTgĨ4e��4GN�1c|̈.CoΧ�`�$�˸@��N����
"��ڜ�FA^L���(eטZ[�%���ʸ�6ϢO���9GY5
2?��U$�0��I%�����+�ڮ�����V�IU�C����~?�GQ��)�(������m�b��j�F��B�t�eN]8<�s�z�!�Zm�1\I*��g
�}���c�����;�������K����i�&�h���jǰ;4���]1;^nҥ4m�̂��x|����f�SrƷ�mx��c-�r��6Ɇ1��H� Ye��A=.�j��I%��*�x4���jni���)BH���dd縤���Zf�����M��l���XM�ф�.a�$R&-�0��(�}�\�?r��`u��w5	�q,�Դ�H�ض�:���";7=̉��လ��⋜����T\Z�0�Ui���^i�J����^{����j�E9������=A/-K�ms-T�������s��S��x���]�
��2}9�p���{7(r.��I��g�mE�z��@��y�ݐn�p�5K�V6{�rn�u	z��]�T�9eJ�-P�[i�4�A�ᰆ(^���7}�-"�G�����%�bͶH_��j�'��˩���?��}��r�n��Aָ�:N���f�p��4�9򢭛J��9C�U�1�TEa�59��yyq�|��ۅ���vo�|~�c���~E{�09��<� to��[1?!�B]�I�7��@��z��)3��s�!����������H��s��4�#�������:�D����~���j?�n@99��V���Ra�$���x��0#��=&�\3�$� ��۠(��[ȓJ9c4tF���q�{'�(���
g��xH��$V]f�cu����OS�P�m���=_<	���Zc��9����47��Mf<���4�aϚ�sz����l�u_ƉF��G�M��I�5k"?�b�����"	�w'��ɰ���ai[��PX�4��U���C�	���5�1�ǌ�LR��f}i׍��X_4���A��������
�5��CM8�ڤҕ�E��t�	qtB�9r=�i��ᥑ���6�q��~���W�VY�YX�w*o��qw�xx�,�����r��{im�����x�h�7��I:�����+gN�q�"��Bg��j�^�g?9�����1�ګ�O;��1��p={�v��+_��)���Z5�d��:r�8ý䈞٧�/J�6��X�����]��#�9�4(ݮ�B������0��QtZ��* �;ѥ�:�O�w�?qʒút�����ezvv���       `   ;  x��Y�r��]���kʩ�e=|�2aI[�,�Q�g1�&�$:�9���Y%묒u> �?��?�Krn|��U�������{��f�y�c,�䑊xK~��"˭	��3��2��X�>;�R��Ԫ\(�^Z�C�ΥM�^��Z�2�\�2�Y��1���[�ց����9nv{�F��z�h<���*�y�f*Q�D�X���S�w��"�yf���L���PI����4WBglP�Һ�S1\&F�k��A$�\�%֖~�{�� 8���N�oy=���'na�1ւ�	��}������/�8:����\d|jU*�J�Υ��\n�ٕJU����KK[��ǜ&�Z��0�����[5���r1LT�H�&�"\n-�~�a"�����Wq8�
-0�E�f�,�i�n�u^�L��\.����Xe<�2r����Be�"�b���%�A�3Ī�f9��cS�c��VT��c3�c���^J)M��e�]��ت,7S���w������G���T�K���fR���ےq�qq�][����S�f�oi�X�"�ar���&��r4�6ÍKk~�P��O f�I�� �z����Ȫ��
��32�K-- ���d��e֙���$�I�_\�W�����3 b&2J<um2�C���tW
��W��uc"�����{'6��b"�>�u\���j&2閲qI�>�B!���-w�[N��a6�H���_�B��	�	�g7�5P�d��|�������\ݸ�j3^gG�������1�\�)h�8j;�	�$/���  �B>J@�@����`E  ��&Oh
��e�]�"Y�xr0%�\��={�ǭ�a��2��N�5T�@�NL�����J�7��w;�Ʀ[�<�b�o�֊r��<�DW���[im!��a��ϕ)��O.x݆����˃�RΡa��\���OA��L��̀�9
��1^��PM�q�On;�3���'���@g�w4�V��*�����N"���dV������3f`f0��ք�%��.�	G�\z��o 7��6����^���O���ib�$�r�5��R��n������Y~��Z��і�����wSr���n�R$�y66`ڮcP��*�!B��'yѯ�d�V��f�8wn���t��ɢH�����n��9R,��7X�$�lĒX�~�5��b��w}��½� ����o@����p`�ⳕ%��_���������`�	���y>�6�*�K�U��1��k2��4]]��'؏������z�Z���J$= �ވ0.��
�$�C�N>A��7b)ػ$�e�J�*"��f��[Rpk��e��Q
�=S�s�}����U ��GP��C¡��Ne) 1�L���������<�Sp�l�bc)9Q���Y)}IcQ�[�	m�L�d�lr	�����z "���(V1s� ��Vƶ`a#$2�T1���6������ nd?�o�Wm��M^��!��ʄKfʽ+p?S��>�����ذ7 ��o�a�n�����`���{�c1+�SLA�`��. GpS�@p�w<�J�e����-]ͯ�� �siq;	M�� ��ka'Y�Ů�\���!�)d2��?F����#Wbg��Y9w���S��Ob���#��L�NI��&�b9S���Dԡ��XIqb�eŐ!z,�e�N��=�fu7[���	�=������@;�o+A5�Aע��2��a|���"%�@�Bd_\��	*)"i�H3��nn��㴰S wŐeG�X�;gPT��nͺZ%ZE�+���3(̹�M�b�H�݇���˒�1/ʃΤ%�e����+�SjtA��Q�`'��$m��jD}N����A�P_�?�a�o?�'zT���X@{al�=�p�u�u���a��Z�[����/6K;�n�d����;��U(,��������}������~�-�AX^j����jE������[
 tO"�������kRz���t�H�4|=�lSЯ�F���d�>9��f�	Q�@j�	�N>�&({tV�욤�,j6�,�4U���e�.���5�`8����G���;h�!UD��Q%`�r�\��q�+�yZo�W�;g����C����$*��%�C�:�����ĕ����{��]��x�1���Y?��Ϯa.j��ףּ�)�O�nSv�>���g�h_*ŏ<�u"T-��������[�I�)J �� �R`7x)���XAET_**����;dh)�N�{C� !�3�u6����Z�Ԛ	"q�D�τ����"������*�/R�~�� �0��*������H�A�T���2#��T�f����Qe�:��5p#@����H�+�U�syZE>���Ґśs=�J�9���|�s��loL*sqTJR��J�N9#1<���X��ѝ_��!��X�TjP�A$��UU	��0��Қ%GH��_�K�J����A@�߫r��T�9�^κ^����y��.k��N鳝s�R��kc�b,����u���C���R�,W�m1] ���QA�b�*��j�nJ1:r���W�]u��6��4�I����_��ɿ�h��d-־7����ix~9��Y�N���DR8j��3ߛ�gD
D����	EH燘$`��v��t�^�bͭż��h���d��Z�j�Q?K�c�i9��%�(Ʋ��V�'P�����ܬ�L+)<A����GA)�*'���N�K�G,��1�Z�УSޏQ�]
��p�����V�a��y��:�
*J�^���_����/����r�sv������7&���/EI��/��^�}�w�uX���#�۱:��M���}���=����ߧ���
�ݝ\���j�[���<������k3��럿��y ���?*Z-�٪"�Z�9U,B��-K,үx�Ŏy.z@b�~����B�bH'����l$��
:f���#@fq@�7��8 ���[�;�Ek���U*Ed)Q�S@�+T\wᲁn%X����e�Ed~��/��~�\�&e�ň��π�&����
PZ1����������h��G�#j�2@����A���ۢ$}e��f�,��/P�*���';�3�NJY:P�4Q��",�_�`�Z$��~��D��=]E�V<E���1���xyER� �v�R ��&t]����'�����>{�bO��͞v���ց[��J����rc�K����3>�"�3�z·��B�N�'�v#߻���Ȱz�֒�*�˝���%��o�?p��:�/ȉ��w���_����݄�@�>,ۍ�Q�ϺG��yDE���M�=��t�I�vhC��Ҡo�
��RH�*:q ɨ��ӟ�����
�Aڸ�q�s��޾�xk�>@w�(����2=p?�}�.��28xD��������$W��h�GED؅�=J���w�2}%粼�-�r�&�2�1	J�6�$xP�Pwg�D�)hh����D�foS��S�ꙫ�ۖ�rĿ<��=�l�s�U?S���i����)8}�v~T�l��N��Ɔ&��� v&���f��W��ua��I	%���v����'���6���d�����[S�|��ɓ�Q,B�      _   �   x�]α�0��}�N.���[.�uaqruiH#$��R�������!qe�S(c����@a�<�u�Ξ$�n\J��A�g���9���Z���>i��⚦�]b��V��d}M�u�2n�Eë}�Q��eL��\��^��`ݞ=���r.4x     